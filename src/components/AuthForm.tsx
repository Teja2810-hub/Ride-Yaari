@@ .. @@
 import React, { useState } from 'react'
 import { Plane, Mail, Lock, User, Shield, ArrowLeft, HelpCircle } from 'lucide-react'
 import { useAuth } from '../../contexts/AuthContext'
 import { supabase } from '../../utils/supabase'
+import Footer from '../Footer'

 type AuthStep = 'credentials' | 'otp-verification'
@@ .. @@
   }

   return (
-    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-2 sm:p-4">
+    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
+      <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
       <div className="w-full max-w-sm sm:max-w-md">
         <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8">
@@ .. @@
           </div>
         </div>
       </div>
+      </div>
+      
+      {/* Footer for auth pages */}
+      <Footer 
+        onHelp={() => setShowHelp(true)}
+        onReviews={() => {}} // No-op for auth page
+        onHowItWorks={() => {}} // No-op for auth page
+      />
     </div>
   )
 }