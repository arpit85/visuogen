import { Dialog, DialogContent } from "@/components/ui/dialog";

interface LoadingModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
}

export default function LoadingModal({ 
  isOpen, 
  title = "Loading", 
  subtitle = "Please wait..." 
}: LoadingModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <div className="text-center p-6">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
