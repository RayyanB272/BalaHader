import api from "./api";

export interface Notification {
  _id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export async function getNotifications(): Promise<
  Notification[]
> {
  const response = await api.get<Notification[]>(
    "/notifications/"
  );

  return response.data;
}

export async function markNotificationRead(
  notificationId: string
): Promise<{ message: string }> {
  const response = await api.patch(
    `/notifications/${notificationId}/read`
  );

  return response.data;
}

export async function markAllNotificationsRead(): Promise<{
  message: string;
}> {
  const response = await api.patch(
    "/notifications/read-all"
  );

  return response.data;
}