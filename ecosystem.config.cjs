module.exports = {
  apps: [
    {
      name: "glovedcat",
      script: "./build/main.js",
      cwd: "./build",
      watch: true,
      env_production: {
        NODE_ENV: "production",
      },
      env_development: {
        NODE_ENV: "development",
      },
    },
  ],
}
