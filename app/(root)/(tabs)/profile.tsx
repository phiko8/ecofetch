import { useUser } from "@clerk/clerk-expo";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import InputField from "@/components/input-field";

const Profile = () => {
  const { user } = useUser();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>My Profile</Text>

        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri: user?.externalAccounts?.[0]?.imageUrl ?? user?.imageUrl,
            }}
            style={styles.avatar}
          />
        </View>

        <View style={styles.infoCard}>
          <InputField
            label="First name"
            placeholder={user?.firstName || "Not Found"}
            containerStyle="w-full"
            inputStyle="p-3.5"
            editable={false}
          />

          <InputField
            label="Last name"
            placeholder={user?.lastName || "Not Found"}
            containerStyle="w-full"
            inputStyle="p-3.5"
            editable={false}
          />

          <InputField
            label="Email"
            placeholder={user?.primaryEmailAddress?.emailAddress || "Not Found"}
            containerStyle="w-full"
            inputStyle="p-3.5"
            editable={false}
          />

          <InputField
            label="Phone"
            placeholder={user?.primaryPhoneNumber?.phoneNumber || "Not Found"}
            containerStyle="w-full"
            inputStyle="p-3.5"
            editable={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    fontSize: 24,
    fontFamily: "JakartaBold",
    marginVertical: 20,
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#ccc",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: "#ccc",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
});

export default Profile;
