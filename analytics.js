import { inject } from '@vercel/analytics';

// Initializes Vercel Web Analytics for tracking visitors & page views.
// Automatically suppresses tracking on localhost / development environments.
inject();
