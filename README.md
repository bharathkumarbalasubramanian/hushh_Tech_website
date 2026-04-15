Run production environments.

🔍 Bug #1: Docker Build Sequence & Layer Optimization
Problem: The original Dockerfile.gcp fell into a "Sequential Trap." Environment variables required for the Vite frontend build were not being injected early enough, causing the production build to fail or default to empty configurations.

The Fix:

Instruction Reordering: Restructured the Docker layers to ensure ARG and ENV declarations precede the build command.

Layer Caching: Optimized the copy sequence to leverage Docker layer caching, significantly reducing build times for future deployments.

Runtime Bridging: Implemented a robust mapping system to ensure build-time arguments are available to the Node.js runtime.

🚀 Bug #2: CI/CD Pipeline & Environment Bridging
Problem: The cloudbuild.yaml configuration lacked the necessary mapping to bridge Google Cloud Build substitution variables into the Cloud Run container environment. This resulted in "Undefined" errors for Supabase and Gemini API connections.

The Fix:

YAML Schema Refinement: Updated the deploy step in cloudbuild.yaml to include explicit --set-env-vars flags.

Variable Sanitization: Implemented a consistent naming convention between GCP Substitution variables (e.g., _GEMINI_API_KEY) and internal application environment variables.

Production Readiness: Verified that all 3rd-party integration keys are securely passed without being hardcoded into the repository.

🛡 Bug #3: Cloud-Native Authentication (Google Wallet API)
Problem: The backend logic was reliant on a physical service-account.json file. While this works in local development, it is a security risk and an architectural failure in Cloud Run, where the file system is ephemeral and secrets should be managed via IAM.

The Fix:

ADC Implementation: Refactored api/google-wallet-pass.js to utilize Application Default Credentials (ADC) via the google-auth-library.

Dynamic Identity Resolution: The system now automatically detects its environment. It uses local JWT keys during development and inherits the Service Account Identity of the Cloud Run instance in production.

Error Resiliency: Added sanitization logic for RSA Private Keys to handle newline character escaping (\n) frequently encountered in environment variable injection.

✅ Impact & Validation
Zero-Config Deployment: The project can now be deployed to any GCP project simply by setting the Build Trigger substitutions.

Enhanced Security: Removed the need for physical service account keys within the container, aligning with SOC2 and PoLP (Principle of Least Privilege) security standards.

Build Integrity: Guaranteed that the Vite frontend is correctly compiled with production-ready API endpoints.

Contributor: Bharath Kumar B.
Focus: AI Software Engineering & DevOps Optimization
