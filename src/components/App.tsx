@@ .. @@
 import TermsOfService from './components/TermsOfService'
 import { Trip, CarRide } from './types'
 import WhatsAppChatButton from './components/WhatsAppChatButton'
+import NotificationPermissionPrompt from './components/NotificationPermissionPrompt'
 import { User } from 'lucide-react'

 type AppView = 'platform-selector' | 'airport-dashboard' | 'car-dashboard' | 'post-trip' | 'find-trip' | 'post-ride' | 'find-ride' | 'profile' | 'help' | 'chat' | 'edit-trip' | 'edit-ride' | 'how-it-works' | 'reviews' | 'privacy-policy' | 'terms-of-service'
@@ .. @@
   const [editingRide, setEditingRide] = useState<CarRide | null>(null)
   const [initialProfileTab, setInitialProfileTab] = useState<string | undefined>(undefined)
   const [showAuthPrompt, setShowAuthPrompt] = useState(false)
+  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false)

   // Check if user is visiting for the first time
@@ .. @@
     }
   }, [user, loading, isGuest])

+  // Check for notification permission prompt
+  useEffect(() => {
+    if (user && !loading && !isGuest) {
+      const hasSeenPrompt = localStorage.getItem('rideyaari-notification-prompt-seen')
+      const hasPermission = 'Notification' in window && Notification.permission === 'granted'
+      
+      if (!hasSeenPrompt && !hasPermission) {
+        // Show notification prompt after 10 seconds for new users
+        setTimeout(() => {
+          setShowNotificationPrompt(true)
+        }, 10000)
+      }
+    }
+  }, [user, loading, isGuest])

   const handleCloseWelcomePopup = () => {
@@ .. @@
       </div>
       <WhatsAppChatButton />
       
+      {/* Notification Permission Prompt */}
+      <NotificationPermissionPrompt
+        isOpen={showNotificationPrompt}
+        onClose={() => {
+          setShowNotificationPrompt(false)
+          localStorage.setItem('rideyaari-notification-prompt-seen', 'true')
+        }}
+        onPermissionGranted={() => {
+          localStorage.setItem('rideyaari-notification-prompt-seen', 'true')
+        }}
+      />
+      
       {/* Auth Prompt Modal */}