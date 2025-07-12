import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { 
  Zap, 
  Image, 
  Crown, 
  Sparkles,
  Check,
  Star,
  Mail,
  UserPlus,
  LogIn
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-2xl flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">VisuoGen</h1>
          </div>
          
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Transform Ideas into
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Stunning Visuals</span>
          </h2>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Create amazing AI-generated images and videos with our advanced models. 
            From photorealistic art and creative illustrations to life like videos- bring your imagination to life.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-primary to-secondary hover:shadow-lg transition-shadow text-lg px-8 py-6"
              >
                Get Started Free
                <Zap className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button 
                variant="outline"
                size="lg" 
                className="text-lg px-8 py-6"
              >
                Sign In
                <LogIn className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Image className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Multiple AI Models</h3>
              <p className="text-gray-600">
                Choose from Google Imagen-4, Midjourney, and Stable Diffusion for different artistic styles
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Lightning Fast</h3>
              <p className="text-gray-600">
                Generate high-quality images in seconds with our optimized infrastructure
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Professional Quality</h3>
              <p className="text-gray-600">
                Create commercial-grade images and videos perfect for marketing, design, and creative projects
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Preview */}
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h3>
          <p className="text-xl text-gray-600 mb-8">Start free, upgrade when you need more power</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="border-2 border-gray-200">
              <CardContent className="p-8">
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Starter</h4>
                <div className="text-3xl font-bold text-gray-900 mb-4">$9<span className="text-lg text-gray-600">/mo</span></div>
                <ul className="space-y-3 text-left">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-accent mr-3" />
                    <span className="text-gray-600">50 credits per month</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-accent mr-3" />
                    <span className="text-gray-600">Basic AI models</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-accent mr-3" />
                    <span className="text-gray-600">Standard quality</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
              </div>
              <CardContent className="p-8">
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Pro</h4>
                <div className="text-3xl font-bold text-gray-900 mb-4">$29<span className="text-lg text-gray-600">/mo</span></div>
                <ul className="space-y-3 text-left">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-accent mr-3" />
                    <span className="text-gray-600">200 credits per month</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-accent mr-3" />
                    <span className="text-gray-600">All AI models</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-accent mr-3" />
                    <span className="text-gray-600">High quality output</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-accent mr-3" />
                    <span className="text-gray-600">Advanced editing tools</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200">
              <CardContent className="p-8">
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Enterprise</h4>
                <div className="text-3xl font-bold text-gray-900 mb-4">$99<span className="text-lg text-gray-600">/mo</span></div>
                <ul className="space-y-3 text-left">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-accent mr-3" />
                    <span className="text-gray-600">750 credits per month</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-accent mr-3" />
                    <span className="text-gray-600">All models + Beta</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-accent mr-3" />
                    <span className="text-gray-600">Ultra quality output</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-accent mr-3" />
                    <span className="text-gray-600">Commercial license</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Social Proof */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-warning text-warning" />
            ))}
          </div>
          <p className="text-gray-600 mb-8">
            "Amazing tool for creating professional images and videos. The AI models are incredibly sophisticated!"
          </p>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-primary text-primary hover:bg-primary hover:text-white"
            onClick={() => window.location.href = '/api/login'}
          >
            Start Creating Today
          </Button>
        </div>
      </div>
    </div>
  );
};
