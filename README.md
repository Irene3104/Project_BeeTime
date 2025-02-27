# BeeTime Project

## Diagnostic Tools

We've added several diagnostic tools to help troubleshoot authentication and API issues:

### Server-Side Endpoints

- `/api/diagnostics/server-status` - Simple endpoint to check if the server is online
- `/auth/test-auth-flow` - Comprehensive test of the authentication flow
- `/time-entries/test-date` - Test endpoint for date handling
- `/debug/validate-token` - Endpoint to validate a token

### Client-Side Utilities

These utilities are available in the browser console:

- `window.runDiagnostics()` - Run a comprehensive diagnostic test
- `window.testVerifyLocation()` - Test the QR code verification endpoint
- `window.clearToken()` - Clear the authentication token and force re-login

### How to Use

1. Open your browser's developer tools (F12 or right-click and select "Inspect")
2. Go to the Console tab
3. Type `window.runDiagnostics()` and press Enter
4. Check the console output for diagnostic information

### Troubleshooting Common Issues

#### Authentication Issues

- If you see "Token expired" errors, try running `window.clearToken()` and log in again
- If token validation fails, check that your JWT_SECRET environment variable is set correctly on the server

#### Date Handling Issues

- The server uses Sydney timezone (Australia/Sydney) for all date calculations
- Make sure your server's system clock is accurate
- Check the output of the `/time-entries/test-date` endpoint for timezone conversion details

#### API Connection Issues

- Verify that CORS is properly configured for your domain
- Check that the API_URL in `src/config/constants.ts` is correct
- Ensure your server is running and accessible
