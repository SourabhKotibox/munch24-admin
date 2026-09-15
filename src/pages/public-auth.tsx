import { useLocation, Link, Redirect } from "wouter";
import { ArrowLeft, Wrench } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import SignInModal from "@/components/SignInModal";

export default function PublicAuthPage() {
  const [location] = useLocation();
  const { settings } = useSettings();

  // If visiting /register, redirect to /login
  if (location === "/register") {
    return <Redirect to="/login" />;
  }

  // Maintenance screen if platform maintenance mode is enabled
  if (settings.maintenanceMode) {
    return (
      <div className="min-h-screen bg-[#030306] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
            <Wrench className="w-10 h-10 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-black mb-2">Under Maintenance</h1>
            <p className="text-white/70 text-sm">The platform is temporarily down for scheduled maintenance. Please check back shortly.</p>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SignInModal
      isOpen={true}
      isPage={true}
    />
  );
}
