import { Stack } from "expo-router";

const Layout =() =>{
  return <Stack>
            <Stack.Screen name = "(tabs)" options={{headerShown: false}}/>
            <Stack.Screen name = "find-collector" options={{headerShown: false}}/>
            <Stack.Screen name = "confirm-collector" options={{headerShown: false}}/> 
            <Stack.Screen name = "book-collector" options={{headerShown: false}}/>
            {/* <Stack.Screen name = "book-collector" options={{headerShown: false}}/> */}
        </Stack>;
}

export default Layout;