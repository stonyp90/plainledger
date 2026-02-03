# PWA Hydration Fixes Applied

## Issue: React Error #300 (Hydration Mismatch)

**Root Cause:** Components were accessing browser APIs (`window`, `navigator`, `localStorage`) during initial render, causing differences between server-side rendering and client-side hydration.

## Fixes Applied

### 1. Created ClientOnly Wrapper
- **File:** `src/components/ClientOnly.tsx`
- **Purpose:** Prevents components from rendering until client-side mount
- **Usage:** Wraps components that use browser APIs

### 2. Fixed useInstallPrompt Hook
- **Issue:** Was accessing `window.matchMedia` and `window.navigator.standalone` during state initialization
- **Fix:** Always initialize state to `false`, check browser APIs only in `useEffect`
- **Result:** Prevents hydration mismatch

### 3. Fixed usePlatformDetect Hook
- **Issue:** State initialization could differ between renders
- **Fix:** Always initialize to `'unknown'`, detect platform in `useEffect` only
- **Result:** Stable initial state, no hydration issues

### 4. Fixed Component Rendering
- **SmartInstallBanner:** Added `mounted` check, wrapped in `ClientOnly`
- **OfflineIndicator:** Added `mounted` check, wrapped in `ClientOnly`
- **GetTheApp:** QR code wrapped in `ClientOnly` with fallback

### 5. Removed Conditional Class Names
- **OfflineIndicator:** Removed dynamic className that could cause hydration mismatch
- **Fix:** Use static className, handle visibility with conditional rendering

## Expected Behavior

✅ **PWA Components:**
- Render only after client-side mount
- No hydration mismatches
- Stable state initialization
- No unnecessary re-renders

⚠️ **Expected Errors (Not PWA-Related):**
- GraphQL 500 errors - API server not running (normal for preview)
- Font preload warnings - Optimization warnings (non-blocking)
- Icon 404s - From other parts of the app

## Testing

The React error #300 should now be resolved for PWA components. If it persists:

1. Check if error is from PWA components:
   - Open DevTools → Console
   - Look for component names in stack trace
   - If not PWA components, the error is from elsewhere in the app

2. Verify PWA functionality:
   - Service worker should register
   - "Get the App" section should display
   - QR code should render
   - No React errors from PWA components

## Files Modified

- `src/components/ClientOnly.tsx` (new)
- `src/components/SmartInstallBanner.tsx`
- `src/components/OfflineIndicator.tsx`
- `src/components/GetTheApp.tsx`
- `src/hooks/useInstallPrompt.ts`
- `src/hooks/usePlatformDetect.ts`
- `src/App.tsx`
