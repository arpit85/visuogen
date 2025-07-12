import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  LogIn,
  Clock,
  Coins,
  Monitor,
  Video,
  Palette,
  Wand2,
  Heart,
  Github,
  Twitter,
  Globe,
  Coffee
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

        {/* AI Models Showcase */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Powered by <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">15+ AI Models</span>
            </h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose from the world's most advanced AI models for images and videos
            </p>
          </div>

          {/* Stacked Cards Layout */}
          <div className="relative max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Featured Image Models */}
              <div className="relative transform rotate-1 hover:rotate-0 transition-transform duration-300">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900">Google Imagen 4</h4>
                      <Badge className="bg-blue-100 text-blue-800">Google</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Exceptional quality and creative interpretation</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        <span>5 credits</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>15s</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="relative transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                <Card className="bg-gradient-to-br from-purple-50 to-pink-100 border-2 border-purple-200 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900">Midjourney v6</h4>
                      <Badge className="bg-purple-100 text-purple-800">PiAPI</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Artistic masterpieces with stunning detail</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        <span>5 credits</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>45s</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="relative transform rotate-1 hover:rotate-0 transition-transform duration-300">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900">FLUX Schnell</h4>
                      <Badge className="bg-green-100 text-green-800">Replicate</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Lightning-fast generation with great quality</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        <span>1 credit</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>8s</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Featured Video Models */}
              <div className="relative transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                <Card className="bg-gradient-to-br from-orange-50 to-red-100 border-2 border-orange-200 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900">Google Veo 3</h4>
                      <Badge className="bg-orange-100 text-orange-800">Video</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Photorealistic video generation up to 8s</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        <span>25 credits</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        <span>1080p</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="relative transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <Card className="bg-gradient-to-br from-cyan-50 to-blue-100 border-2 border-cyan-200 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900">Minimax Hailuo</h4>
                      <Badge className="bg-cyan-100 text-cyan-800">Video</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Advanced video AI with director controls</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        <span>15 credits</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        <span>10s</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="relative transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                <Card className="bg-gradient-to-br from-yellow-50 to-amber-100 border-2 border-yellow-200 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900">+ 10 More Models</h4>
                      <Badge className="bg-yellow-100 text-yellow-800">Premium</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Stable Diffusion, Google Imagen, and more</p>
                    <div className="flex items-center justify-center text-xs text-gray-500">
                      <Sparkles className="h-3 w-3 mr-1" />
                      <span>Endless possibilities</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center mt-12">
            <div className="flex items-center justify-center space-x-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-warning text-warning" />
              ))}
            </div>
            <p className="text-gray-600 mb-8">
              "The variety of AI models is incredible! From artistic Midjourney to lightning-fast FLUX - there's a perfect model for every project."
            </p>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-secondary hover:shadow-lg transition-shadow text-lg px-8 py-6"
              onClick={() => window.location.href = '/api/login'}
            >
              Explore All Models
              <Wand2 className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Informal Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">VisuoGen</h3>
              </div>
              <p className="text-gray-600 mb-4 max-w-md">
                Making AI-powered visual content creation accessible to everyone. 
                From stunning images to captivating videos - your creativity has no limits.
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Coffee className="h-4 w-4" />
                <span>Made with love by creators, for creators</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Quick Start</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/api/login" className="text-gray-600 hover:text-primary transition-colors">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="text-gray-600 hover:text-primary transition-colors">
                    Create Account
                  </Link>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-primary transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-primary transition-colors">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Connect</h4>
              <div className="space-y-3">
                <a 
                  href="#" 
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-primary transition-colors"
                >
                  <Github className="h-4 w-4" />
                  <span>Open Source</span>
                </a>
                <a 
                  href="#" 
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-primary transition-colors"
                >
                  <Twitter className="h-4 w-4" />
                  <span>@VisuoGen</span>
                </a>
                <a 
                  href="#" 
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span>info@visuogen.com</span>
                </a>
                <a 
                  href="#" 
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-primary transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  <span>Community</span>
                </a>
                <a href="https://discord.gg/vCAwvNhF"></a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500 mb-4 md:mb-0">
              © 2025 VisuoGen. Built with AI, designed for humans.
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <div className="flex items-center space-x-1">
                
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
