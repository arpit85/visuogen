import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { nanoid } from "nanoid";

// Generate session ID
const SESSION_ID = nanoid();

interface TrackEventParams {
  eventType: string;
  eventData?: any;
}

export function useAnalytics() {
  const trackEventMutation = useMutation({
    mutationFn: async ({ eventType, eventData }: TrackEventParams) => {
      return apiRequest("POST", "/api/analytics/track", {
        eventType,
        eventData,
        sessionId: SESSION_ID,
      });
    },
  });

  const trackEvent = (eventType: string, eventData?: any) => {
    trackEventMutation.mutate({ eventType, eventData });
  };

  return {
    trackEvent,
    isTracking: trackEventMutation.isPending,
  };
}

// Event types for consistency
export const ANALYTICS_EVENTS = {
  // Page views
  PAGE_VIEW: 'page_view',
  
  // User actions
  LOGIN: 'login',
  LOGOUT: 'logout',
  SIGNUP: 'signup',
  
  // Image generation
  IMAGE_GENERATE_START: 'image_generate_start',
  IMAGE_GENERATE_SUCCESS: 'image_generate_success',
  IMAGE_GENERATE_ERROR: 'image_generate_error',
  
  // Image actions
  IMAGE_FAVORITE: 'image_favorite',
  IMAGE_UNFAVORITE: 'image_unfavorite',
  IMAGE_DOWNLOAD: 'image_download',
  IMAGE_SHARE: 'image_share',
  IMAGE_DELETE: 'image_delete',
  
  // Image editing
  IMAGE_EDIT_START: 'image_edit_start',
  IMAGE_EDIT_SUCCESS: 'image_edit_success',
  IMAGE_FILTER_APPLY: 'image_filter_apply',
  
  // Credits and purchases
  CREDITS_PURCHASE: 'credits_purchase',
  CREDITS_LOW_WARNING: 'credits_low_warning',
  COUPON_REDEEM: 'coupon_redeem',
  
  // Batch operations
  BATCH_CREATE: 'batch_create',
  BATCH_START: 'batch_start',
  BATCH_COMPLETE: 'batch_complete',
  
  // Collections and sharing
  COLLECTION_CREATE: 'collection_create',
  COLLECTION_SHARE: 'collection_share',
  SHARED_IMAGE_VIEW: 'shared_image_view',
  
  // Plan and subscription
  PLAN_UPGRADE: 'plan_upgrade',
  PLAN_DOWNGRADE: 'plan_downgrade',
  
  // Settings and profile
  PROFILE_UPDATE: 'profile_update',
  NOTIFICATION_SETTINGS_UPDATE: 'notification_settings_update',
  
  // Error events
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
} as const;

export type AnalyticsEventType = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];