const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '..', 'src', 'lib', 'api-client.ts');
let content = fs.readFileSync(filepath, 'utf8');

if (!content.includes('useGetAdminNotifications')) {
  const codeToInject = `
export const useGetAdminNotifications = () => {
  return useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => api("/admin-notifications"),
    refetchInterval: 30000, // Poll every 30 seconds
  });
};

export const useMarkAdminNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api("/admin-notifications/read-all", {
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
  });
};
`;
  content += codeToInject;
  fs.writeFileSync(filepath, content, 'utf8');
  console.log('Injected admin notifications hooks');
}
