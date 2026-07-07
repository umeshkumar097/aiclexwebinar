export function validate(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const required: string[] = [
    // Intentionally minimal for dev — add stricter checks for production
  ];

  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return env;
}
