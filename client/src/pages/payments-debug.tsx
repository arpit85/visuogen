import { useAuth } from "@/hooks/useAuth";

export default function PaymentsDebug() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please log in to access payments.</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Payments Page Debug</h1>
      <p>This is a debug version to isolate the runtime error.</p>
      <p>User is authenticated: {isAuthenticated ? "Yes" : "No"}</p>
    </div>
  );
}