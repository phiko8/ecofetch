import { useUser } from "@clerk/clerk-expo";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DisposalCard from "@/components/DisposalCard";
import { images } from "@/constants";
import { useFetch } from "@/lib/fetch";
import { Disposal } from "@/types/type";

const Disposals = () => {
  const { user } = useUser();

  const {
    data: recentRides,
    loading,
    error,
  } = useFetch<Disposal[]>(`/(api)/disposal/${user?.id}`);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={recentRides}
        renderItem={({ item }) => <DisposalCard disposal={item} />}
        keyExtractor={(item, index) => index.toString()}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {!loading ? (
              <>
                <Image
                  source={images.noResult}
                  style={styles.emptyImage}
                  resizeMode="contain"
                />
                <Text style={styles.emptyText}>No recent Disposals found</Text>
              </>
            ) : (
              <ActivityIndicator size="small" color="#000" />
            )}
          </View>
        )}
        ListHeaderComponent={
          <Text style={styles.header}>All Disposals</Text>
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
    fontFamily: "JakartaBold", // Make sure this font is loaded via `expo-font` or similar
    marginVertical: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    marginTop: 50,
  },
  emptyImage: {
    width: 160,
    height: 160,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#555",
  },
});

export default Disposals;
