import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Copy, Twitter, Facebook, Instagram, Linkedin, MessageCircle } from 'lucide-react';
import { SiReddit, SiPinterest, SiTumblr, SiTelegram } from 'react-icons/si';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: {
    id: number;
    prompt: string;
    imageUrl: string;
    modelId: number;
    createdAt: string;
  };
}

interface SocialPlatform {
  name: string;
  icon: React.ReactNode;
  color: string;
  getShareUrl: (imageUrl: string, text: string, hashtags: string[]) => string;
  maxLength?: number;
}

const socialPlatforms: SocialPlatform[] = [
  {
    name: 'Twitter',
    icon: <Twitter className="w-5 h-5" />,
    color: 'bg-blue-500 hover:bg-blue-600',
    maxLength: 280,
    getShareUrl: (imageUrl: string, text: string, hashtags: string[]) => {
      const tweet = `${text} ${hashtags.map(tag => `#${tag}`).join(' ')} ${imageUrl}`;
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
    }
  },
  {
    name: 'Facebook',
    icon: <Facebook className="w-5 h-5" />,
    color: 'bg-blue-600 hover:bg-blue-700',
    getShareUrl: (imageUrl: string, text: string) => {
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(imageUrl)}&quote=${encodeURIComponent(text)}`;
    }
  },
  {
    name: 'LinkedIn',
    icon: <Linkedin className="w-5 h-5" />,
    color: 'bg-blue-700 hover:bg-blue-800',
    getShareUrl: (imageUrl: string, text: string) => {
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(text)}`;
    }
  },
  {
    name: 'Reddit',
    icon: <SiReddit className="w-5 h-5" />,
    color: 'bg-orange-500 hover:bg-orange-600',
    getShareUrl: (imageUrl: string, text: string) => {
      return `https://www.reddit.com/submit?url=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(text)}`;
    }
  },
  {
    name: 'Pinterest',
    icon: <SiPinterest className="w-5 h-5" />,
    color: 'bg-red-600 hover:bg-red-700',
    getShareUrl: (imageUrl: string, text: string) => {
      return `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(imageUrl)}&description=${encodeURIComponent(text)}&media=${encodeURIComponent(imageUrl)}`;
    }
  },
  {
    name: 'Tumblr',
    icon: <SiTumblr className="w-5 h-5" />,
    color: 'bg-blue-800 hover:bg-blue-900',
    getShareUrl: (imageUrl: string, text: string) => {
      return `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(text)}`;
    }
  },
  {
    name: 'Telegram',
    icon: <SiTelegram className="w-5 h-5" />,
    color: 'bg-blue-500 hover:bg-blue-600',
    getShareUrl: (imageUrl: string, text: string) => {
      return `https://t.me/share/url?url=${encodeURIComponent(imageUrl)}&text=${encodeURIComponent(text)}`;
    }
  },
  {
    name: 'WhatsApp',
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'bg-green-500 hover:bg-green-600',
    getShareUrl: (imageUrl: string, text: string) => {
      return `https://wa.me/?text=${encodeURIComponent(`${text} ${imageUrl}`)}`;
    }
  }
];

const defaultHashtags = [
  'AIArt',
  'GeneratedArt',
  'ArtificialIntelligence',
  'DigitalArt',
  'AIGenerated',
  'MachineLearning',
  'CreativeAI',
  'TechArt',
  'Innovation',
  'FutureArt'
];

export default function SocialShareModal({ isOpen, onClose, image }: SocialShareModalProps) {
  const { toast } = useToast();
  const [customText, setCustomText] = React.useState('');
  const [selectedHashtags, setSelectedHashtags] = React.useState<string[]>(['AIArt', 'GeneratedArt', 'Imagiify']);
  const [customHashtag, setCustomHashtag] = React.useState('');

  // Generate default share text based on the image prompt
  const defaultText = React.useMemo(() => {
    const truncatedPrompt = image.prompt.length > 100 
      ? image.prompt.substring(0, 97) + '...' 
      : image.prompt;
    return `Check out this amazing AI-generated image: "${truncatedPrompt}" Created with Imagiify!`;
  }, [image.prompt]);

  const shareText = customText || defaultText;

  const recordShareMutation = useMutation({
    mutationFn: async (shareData: { platform: string; shareText: string; hashtags: string }) => {
      return await apiRequest('POST', '/api/social-shares', {
        imageId: image.id,
        platform: shareData.platform,
        shareText: shareData.shareText,
        hashtags: shareData.hashtags,
      });
    },
  });

  const handlePlatformShare = (platform: SocialPlatform) => {
    const shareUrl = platform.getShareUrl(image.imageUrl, shareText, selectedHashtags);
    
    // Record the social share
    recordShareMutation.mutate({
      platform: platform.name.toLowerCase(),
      shareText,
      hashtags: selectedHashtags.join(','),
    });
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
    
    toast({
      title: `Shared to ${platform.name}`,
      description: "Share window opened successfully",
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Share text has been copied",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const addHashtag = () => {
    if (customHashtag.trim() && !selectedHashtags.includes(customHashtag.trim())) {
      setSelectedHashtags([...selectedHashtags, customHashtag.trim()]);
      setCustomHashtag('');
    }
  };

  const removeHashtag = (hashtag: string) => {
    setSelectedHashtags(selectedHashtags.filter(tag => tag !== hashtag));
  };

  const toggleHashtag = (hashtag: string) => {
    if (selectedHashtags.includes(hashtag)) {
      removeHashtag(hashtag);
    } else {
      setSelectedHashtags([...selectedHashtags, hashtag]);
    }
  };

  const fullShareText = `${shareText} ${selectedHashtags.map(tag => `#${tag}`).join(' ')}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="w-5 h-5" />
            Quick Share to Social Media
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Preview */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-32 aspect-square">
              <img
                src={image.imageUrl}
                alt={image.prompt}
                className="w-full h-full object-cover rounded-lg border"
              />
            </div>
            <div className="flex-1 space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Original Prompt:
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                {image.prompt}
              </div>
            </div>
          </div>

          {/* Custom Share Text */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Customize Your Message</label>
            <Textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={defaultText}
              rows={3}
              className="resize-none"
            />
            <div className="text-xs text-gray-500">
              Leave empty to use the default message
            </div>
          </div>

          {/* Hashtag Management */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Hashtags</label>
            
            {/* Selected Hashtags */}
            <div className="flex flex-wrap gap-2">
              {selectedHashtags.map((hashtag) => (
                <Badge
                  key={hashtag}
                  variant="secondary"
                  className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900"
                  onClick={() => removeHashtag(hashtag)}
                >
                  #{hashtag} ×
                </Badge>
              ))}
            </div>

            {/* Add Custom Hashtag */}
            <div className="flex gap-2">
              <Input
                value={customHashtag}
                onChange={(e) => setCustomHashtag(e.target.value)}
                placeholder="Add custom hashtag"
                onKeyPress={(e) => e.key === 'Enter' && addHashtag()}
                className="flex-1"
              />
              <Button onClick={addHashtag} variant="outline" size="sm">
                Add
              </Button>
            </div>

            {/* Suggested Hashtags */}
            <div className="space-y-2">
              <div className="text-xs text-gray-500">Suggested hashtags:</div>
              <div className="flex flex-wrap gap-2">
                {defaultHashtags.filter(tag => !selectedHashtags.includes(tag)).map((hashtag) => (
                  <Badge
                    key={hashtag}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-white"
                    onClick={() => toggleHashtag(hashtag)}
                  >
                    #{hashtag} +
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Preview</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(fullShareText)}
                className="flex items-center gap-1"
              >
                <Copy className="w-4 h-4" />
                Copy Text
              </Button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
              {fullShareText}
            </div>
            <div className="text-xs text-gray-500">
              Character count: {fullShareText.length}
            </div>
          </div>

          {/* Social Platform Buttons */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Share on:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {socialPlatforms.map((platform) => (
                <Button
                  key={platform.name}
                  onClick={() => handlePlatformShare(platform)}
                  className={`${platform.color} text-white flex items-center gap-2 justify-center p-3 h-auto`}
                  variant="default"
                >
                  {platform.icon}
                  <span className="text-sm font-medium">{platform.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => copyToClipboard(image.imageUrl)}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Image URL
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}