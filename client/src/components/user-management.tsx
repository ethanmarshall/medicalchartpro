import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, Shield, UserPlus, Trash2, LogOut, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface UserManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserManagement({ isOpen, onClose }: UserManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ username: "", pin: "", role: "student" });
  const [showPin, setShowPin] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all users (admin and instructor only)
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: isOpen && (user?.role === 'instructor' || user?.role === 'admin'),
    retry: false,
  });

  const addUserMutation = useMutation({
    mutationFn: async (userData: { username: string; pin: string; role: string }) => {
      return await apiRequest("/api/users", "POST", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setFormData({ username: "", pin: "", role: "student" });
      setShowAddForm(false);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/users/${userId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/auth/logout", "POST");
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.reload();
    },
  });

  const generateRandomPin = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setFormData({ ...formData, pin });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.username && formData.pin && formData.role) {
      addUserMutation.mutate(formData);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      logoutMutation.mutate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2" />
            User Management
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
            data-testid="button-close-user-management"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Current User Info */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Shield className="w-5 h-5 mr-2" />
                Current Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{user?.username}</p>
                  <p className="text-sm text-gray-600 capitalize">{user?.role}</p>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                  disabled={logoutMutation.isPending}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* User Management (Instructor and Admin Only) */}
          {(user?.role === 'instructor' || user?.role === 'admin') && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Manage Users</h3>
                <Button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-add-user"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>

              {/* Add User Form */}
              {showAddForm && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Add New User</CardTitle>
                    <CardDescription>Create a new user account with PIN authentication</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          placeholder="Enter username"
                          required
                          data-testid="input-username"
                        />
                      </div>

                      <div>
                        <Label htmlFor="pin">PIN Code</Label>
                        <div className="flex space-x-2">
                          <div className="relative flex-1">
                            <Input
                              id="pin"
                              type={showPin ? "text" : "password"}
                              value={formData.pin}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                if (value.length <= 6) {
                                  setFormData({ ...formData, pin: value });
                                }
                              }}
                              placeholder="Enter 6-digit PIN"
                              className="pr-10"
                              maxLength={6}
                              required
                              data-testid="input-pin-code"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPin(!showPin)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <Button
                            type="button"
                            onClick={generateRandomPin}
                            variant="outline"
                            data-testid="button-generate-pin"
                          >
                            Generate
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="instructor">Instructor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {addUserMutation.error && (
                        <Alert variant="destructive">
                          <AlertDescription>
                            Failed to create user. Please try again.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="flex space-x-2">
                        <Button
                          type="submit"
                          disabled={!formData.username || !formData.pin || formData.pin.length !== 6 || addUserMutation.isPending}
                          data-testid="button-create-user"
                        >
                          {addUserMutation.isPending ? "Creating..." : "Create User"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddForm(false)}
                          data-testid="button-cancel-add-user"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Users List */}
              <Card>
                <CardHeader>
                  <CardTitle>Existing Users</CardTitle>
                  <CardDescription>Manage user accounts and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-4">Loading users...</div>
                  ) : users && Array.isArray(users) && users.length > 0 ? (
                    <div className="space-y-2">
                      {users.map((u: any) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          data-testid={`user-item-${u.id}`}
                        >
                          <div>
                            <p className="font-medium text-gray-900">{u.username}</p>
                            <p className="text-sm text-gray-600 capitalize">{u.role}</p>
                            {/* Hide admin PIN from instructor view */}
                            {!(user?.role === 'instructor' && u.role === 'admin') && (
                              <p className="text-xs text-gray-500">PIN: {u.pin}</p>
                            )}
                            {user?.role === 'instructor' && u.role === 'admin' && (
                              <p className="text-xs text-gray-500">PIN: ••••••</p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            {/* Prevent instructor from deleting admin users and prevent self-deletion */}
                            {u.id !== user?.id && !(user?.role === 'instructor' && u.role === 'admin') && (
                              <Button
                                onClick={() => handleDeleteUser(u.id)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:border-red-300"
                                disabled={deleteUserMutation.isPending}
                                data-testid={`button-delete-user-${u.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">No users found</div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Student View */}
          {user?.role === 'student' && (
            <div className="text-center py-8">
              <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Student Account</h3>
              <p className="text-gray-600 mb-4">You don't have permission to manage users.</p>
              <p className="text-sm text-gray-500">Contact an instructor for account management.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}