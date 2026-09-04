import { useUser } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DisposalCard from "@/components/DisposalCard";
import { images } from "@/constants";
import { fetchAPI } from "@/lib/fetch";
import { Disposal } from "@/types/type";

const PAGE_SIZE = 10;

const Disposals = () => {
  const { user } = useUser();

  const [disposals, setDisposals] = useState<Disposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");

  const loadPage = useCallback(
    async (pageOffset: number, append: boolean) => {
      if (!user?.id) return;
      append ? setLoadingMore(true) : setLoading(true);
      setError("");
      try {
        const res = await fetchAPI(
          `/(api)/Disposal/${user.id}?limit=${PAGE_SIZE}&offset=${pageOffset}`
        );
        const items = (res?.data as Disposal[]) ?? [];
        setDisposals((prev) => (append ? [...prev, ...items] : items));
        setHasMore(res?.hasMore ?? false);
        setOffset(pageOffset + items.length);
      } catch {
        setError("Failed to load disposals. Pull down to retry.");
      } finally {
        append ? setLoadingMore(false) : setLoading(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    loadPage(0, false);
  }, [loadPage]);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={disposals}
        renderItem={({ item }) => <DisposalCard disposal={item} />}
        keyExtractor={(item) => item.ride_id.toString()}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentContainer}
        onRefresh={() => loadPage(0, false)}
        refreshing={loading}
        ListHeaderComponent={
          <Text style={styles.header}>All Disposals</Text>
        }
        ListEmptyComponent={() =>
          !loading ? (
            <View style={styles.emptyContainer}>
              {error ? (
                <>
                  <Text style={styles.emptyText}>{error}</Text>
                  <TouchableOpacity
                    onPress={() => loadPage(0, false)}
                    style={styles.retryBtn}
                  >
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Image
                    source={images.noResult}
                    style={styles.emptyImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.emptyText}>No disposals found</Text>
                </>
              )}
            </View>
          ) : null
        }
        ListFooterComponent={
          hasMore && disposals.length > 0 ? (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => loadPage(offset, true)}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color="#1AB045" />
              ) : (
                <Text style={styles.loadMoreText}>Load More</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  list: {
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginVertical: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
    gap: 8,
  },
  emptyImage: {
    width: 160,
    height: 160,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#1AB045",
    borderRadius: 20,
  },
  retryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  loadMoreBtn: {
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1AB045",
  },
});

export default Disposals;
