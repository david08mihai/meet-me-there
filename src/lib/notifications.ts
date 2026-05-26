import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    alert("Folosește telefon fizic");
    return;
  }

  let { status } = await Notifications.getPermissionsAsync();
  console.log("DEVICE:", Device.isDevice);
  console.log("STATUS:", status);
  if (status !== "granted") {
    const result = await Notifications.requestPermissionsAsync();
    status = result.status;
  }

  if (status !== "granted") {
    alert("Nu ai dat permisiune");
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  console.log("EXPO PUSH TOKEN:", token);

  return token;
}