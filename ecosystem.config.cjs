module.exports = {
  apps: [
    {
      name: "glovedcat",
      script: "build/main.js",
      env_production: {
        NODE_ENV: "production",
      },
      env_development: {
        NODE_ENV: "development",
      },
    },
  ],
}
