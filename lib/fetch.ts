import { useCallback, useEffect, useState } from "react";

// In dev the Expo server handles relative paths. In production we need an absolute base.
const BASE_URL = __DEV__
    ? ""
    : (process.env.EXPO_PUBLIC_SERVER_URL ?? "").replace(/\/$/, "");

export const fetchAPI = async (url: string, options?: RequestInit) => {
    try {
        const resolvedUrl = url.startsWith("/") && BASE_URL ? `${BASE_URL}${url}` : url;
        const response = await fetch(resolvedUrl, options);
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const body = await response.json();
                if (body?.error) errorMessage = body.error;
            } catch {}
            throw new Error(errorMessage);
        }
        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
};

export const useFetch = <T>(url: string | null, options?: RequestInit) => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Stable key derived from options content so the hook re-fetches only
    // when options actually change, not on every render reference change.
    const optionsKey = options ? JSON.stringify(options) : null;

    const fetchData = useCallback(async () => {
        if (!url) return;
        setLoading(true);
        setError(null);

        try {
            const result = await fetchAPI(url, options);
            setData(result.data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, optionsKey]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {data, loading, error, refetch: fetchData};
};