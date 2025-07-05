import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

export default function PaymentsDebug() {
  const { isAuthenticated, isLoading } = useAuth();

  // Test basic data fetching
  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ['/api/credit-packages'],
    enabled: isAuthenticated,
  });

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
      
      <div className="mt-4">
        <h2 className="text-lg font-semibold">Testing Credit Packages API:</h2>
        {packagesLoading ? (
          <p>Loading packages...</p>
        ) : (
          <pre className="bg-gray-100 p-2 rounded text-sm">
            {JSON.stringify(packages, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}