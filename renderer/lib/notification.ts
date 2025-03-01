export function showNotification() {
    const notificationTitle = "My Notification 🔔";
    console.count("Start Notify");
    new Notification(notificationTitle, {
        body: "This is a sample notification.",
        tag: "test",
    }).onclick = () => console.log("Notification Clicked");
};