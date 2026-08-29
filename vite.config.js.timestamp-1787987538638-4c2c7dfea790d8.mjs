// vite.config.js
import { defineConfig } from "file:///C:/Users/shriy/OneDrive/Documents/munsoc26%20new/MUN-Bhargs/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
import { ViteImageOptimizer } from "file:///C:/Users/shriy/OneDrive/Documents/munsoc26%20new/MUN-Bhargs/node_modules/vite-plugin-image-optimizer/dist/index.js";

// api/create-sheet.js
import { google } from "file:///C:/Users/shriy/OneDrive/Documents/munsoc26%20new/MUN-Bhargs/node_modules/googleapis/build/src/index.js";
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Only POST is supported." });
  }
  try {
    const { delegationName, delegationType, headName, email, phone } = req.body || {};
    if (!delegationName || !delegationName.trim()) {
      return res.status(400).json({ success: false, error: "Delegation Name is required." });
    }
    const isInternal = (delegationType || "").toLowerCase() === "internal";
    const headers = isInternal ? [
      "Sl No",
      "Name",
      "USN",
      "Committee Preference 1",
      "Portfolio Preference 1",
      "Portfolio Preference 2",
      "Portfolio Preference 3",
      "Committee Preference 2",
      "Portfolio Preference 1",
      "Portfolio Preference 2",
      "Portfolio Preference 3"
    ] : [
      "Sl No",
      "Name",
      "Institution",
      "USN",
      "Committee Preference 1",
      "Portfolio Preference 1",
      "Portfolio Preference 2",
      "Portfolio Preference 3",
      "Committee Preference 2",
      "Portfolio Preference 1",
      "Portfolio Preference 2",
      "Portfolio Preference 3"
    ];
    const title = `RNS MUN 26 - ${delegationName.trim()} Roster`;
    let credentials = null;
    if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      try {
        credentials = typeof process.env.GOOGLE_SERVICE_ACCOUNT === "string" ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT) : process.env.GOOGLE_SERVICE_ACCOUNT;
      } catch (err) {
        console.error("Error parsing GOOGLE_SERVICE_ACCOUNT JSON:", err);
      }
    } else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        project_id: process.env.GOOGLE_PROJECT_ID
      };
    }
    if (!credentials) {
      console.warn("[INFO] GOOGLE_SERVICE_ACCOUNT not configured in environment. Using fallback Google Sheets template creation URL.");
      const encodedTitle = encodeURIComponent(title);
      const fallbackUrl = `https://docs.google.com/spreadsheets/create?title=${encodedTitle}`;
      return res.status(200).json({
        success: true,
        sheetUrl: fallbackUrl,
        isFallback: true,
        message: "Google Service Account credentials not set. Returned Google Sheets template URL."
      });
    }
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/drive.file"
      ]
    });
    const sheets = google.sheets({ version: "v4", auth });
    const drive = google.drive({ version: "v3", auth });
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title
        },
        sheets: [
          {
            properties: {
              title: "Delegates Roster",
              gridProperties: {
                rowCount: 100,
                columnCount: headers.length,
                frozenRowCount: 1
              }
            }
          }
        ]
      }
    });
    const spreadsheetId = createResponse.data.spreadsheetId;
    const sheetUrl = createResponse.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Delegates Roster!A1",
      valueInputOption: "RAW",
      requestBody: {
        values: [headers]
      }
    });
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: "writer",
          type: "anyone"
        }
      });
    } catch (permError) {
      console.warn("Could not set anyone permission on sheet:", permError.message);
    }
    return res.status(200).json({
      success: true,
      sheetUrl,
      spreadsheetId
    });
  } catch (error) {
    console.error("Error creating Google Sheet:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create Google Sheet"
    });
  }
}

// vite.config.js
var cleanUrlsPlugin = () => ({
  name: "clean-urls",
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url.split("?")[0];
      if (url === "/api/create-sheet") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", async () => {
          try {
            req.body = body ? JSON.parse(body) : {};
          } catch (e) {
            req.body = {};
          }
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (data) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
            return res;
          };
          try {
            await handler(req, res);
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
        return;
      }
      const hasExtension = /\.[a-zA-Z0-9]+$/.test(url);
      if (!hasExtension) {
        if (url === "/team") {
          req.url = "/team.html" + req.url.substring(5);
        } else if (url === "/stay-connected") {
          req.url = "/stay-connected.html" + req.url.substring(15);
        } else if (url === "/past-events") {
          req.url = "/past-events.html" + req.url.substring(12);
        } else if (url === "/registration") {
          req.url = "/registration.html" + req.url.substring(13);
        } else if (url === "/channels") {
          req.url = "/channels.html" + req.url.substring(9);
        } else if (url === "/404") {
          req.url = "/404.html" + req.url.substring(4);
        } else if (url !== "/" && url !== "") {
          req.url = "/404.html";
        }
      }
      next();
    });
  }
});
var vite_config_default = defineConfig({
  plugins: [
    cleanUrlsPlugin(),
    ViteImageOptimizer({
      png: {
        quality: 75
      },
      jpeg: {
        quality: 75
      },
      jpg: {
        quality: 75
      },
      webp: {
        quality: 75
      },
      svg: false
    })
  ],
  server: {
    watch: {
      ignored: [
        "**/*.crdownload",
        "**/*.tmp",
        "**/*.part",
        "**/node_modules/**",
        "**/shoe-finder/**"
      ]
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), "index.html"),
        connected: resolve(process.cwd(), "stay-connected.html"),
        team: resolve(process.cwd(), "team.html"),
        past: resolve(process.cwd(), "past-events.html"),
        registration: resolve(process.cwd(), "registration.html"),
        channels: resolve(process.cwd(), "channels.html"),
        error: resolve(process.cwd(), "404.html")
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAiYXBpL2NyZWF0ZS1zaGVldC5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHNocml5XFxcXE9uZURyaXZlXFxcXERvY3VtZW50c1xcXFxtdW5zb2MyNiBuZXdcXFxcTVVOLUJoYXJnc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcc2hyaXlcXFxcT25lRHJpdmVcXFxcRG9jdW1lbnRzXFxcXG11bnNvYzI2IG5ld1xcXFxNVU4tQmhhcmdzXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9zaHJpeS9PbmVEcml2ZS9Eb2N1bWVudHMvbXVuc29jMjYlMjBuZXcvTVVOLUJoYXJncy92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IFZpdGVJbWFnZU9wdGltaXplciB9IGZyb20gJ3ZpdGUtcGx1Z2luLWltYWdlLW9wdGltaXplcic7XHJcblxyXG5pbXBvcnQgY3JlYXRlU2hlZXRIYW5kbGVyIGZyb20gJy4vYXBpL2NyZWF0ZS1zaGVldC5qcyc7XHJcblxyXG5jb25zdCBjbGVhblVybHNQbHVnaW4gPSAoKSA9PiAoe1xyXG4gIG5hbWU6ICdjbGVhbi11cmxzJyxcclxuICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XHJcbiAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICBjb25zdCB1cmwgPSByZXEudXJsLnNwbGl0KCc/JylbMF07XHJcblxyXG4gICAgICBpZiAodXJsID09PSAnL2FwaS9jcmVhdGUtc2hlZXQnKSB7XHJcbiAgICAgICAgbGV0IGJvZHkgPSAnJztcclxuICAgICAgICByZXEub24oJ2RhdGEnLCBjaHVuayA9PiB7IGJvZHkgKz0gY2h1bms7IH0pO1xyXG4gICAgICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcmVxLmJvZHkgPSBib2R5ID8gSlNPTi5wYXJzZShib2R5KSA6IHt9O1xyXG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICByZXEuYm9keSA9IHt9O1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmVzLnN0YXR1cyA9IChjb2RlKSA9PiB7XHJcbiAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gY29kZTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlcztcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgICByZXMuanNvbiA9IChkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzO1xyXG4gICAgICAgICAgfTtcclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IGNyZWF0ZVNoZWV0SGFuZGxlcihyZXEsIHJlcyk7XHJcbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGhhc0V4dGVuc2lvbiA9IC9cXC5bYS16QS1aMC05XSskLy50ZXN0KHVybCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIWhhc0V4dGVuc2lvbikge1xyXG4gICAgICAgIGlmICh1cmwgPT09ICcvdGVhbScpIHtcclxuICAgICAgICAgIHJlcS51cmwgPSAnL3RlYW0uaHRtbCcgKyByZXEudXJsLnN1YnN0cmluZyg1KTtcclxuICAgICAgICB9IGVsc2UgaWYgKHVybCA9PT0gJy9zdGF5LWNvbm5lY3RlZCcpIHtcclxuICAgICAgICAgIHJlcS51cmwgPSAnL3N0YXktY29ubmVjdGVkLmh0bWwnICsgcmVxLnVybC5zdWJzdHJpbmcoMTUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodXJsID09PSAnL3Bhc3QtZXZlbnRzJykge1xyXG4gICAgICAgICAgcmVxLnVybCA9ICcvcGFzdC1ldmVudHMuaHRtbCcgKyByZXEudXJsLnN1YnN0cmluZygxMik7XHJcbiAgICAgICAgfSBlbHNlIGlmICh1cmwgPT09ICcvcmVnaXN0cmF0aW9uJykge1xyXG4gICAgICAgICAgcmVxLnVybCA9ICcvcmVnaXN0cmF0aW9uLmh0bWwnICsgcmVxLnVybC5zdWJzdHJpbmcoMTMpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodXJsID09PSAnL2NoYW5uZWxzJykge1xyXG4gICAgICAgICAgcmVxLnVybCA9ICcvY2hhbm5lbHMuaHRtbCcgKyByZXEudXJsLnN1YnN0cmluZyg5KTtcclxuICAgICAgICB9IGVsc2UgaWYgKHVybCA9PT0gJy80MDQnKSB7XHJcbiAgICAgICAgICByZXEudXJsID0gJy80MDQuaHRtbCcgKyByZXEudXJsLnN1YnN0cmluZyg0KTtcclxuICAgICAgICB9IGVsc2UgaWYgKHVybCAhPT0gJy8nICYmIHVybCAhPT0gJycpIHtcclxuICAgICAgICAgIC8vIFNlcnZlIGN1c3RvbSA0MDQgcGFnZSBmb3IgYW55IHVubWF0Y2hlZCBwYWdlIHJvdXRlc1xyXG4gICAgICAgICAgcmVxLnVybCA9ICcvNDA0Lmh0bWwnO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBuZXh0KCk7XHJcbiAgICB9KTtcclxuICB9XHJcbn0pO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICBjbGVhblVybHNQbHVnaW4oKSxcclxuICAgIFZpdGVJbWFnZU9wdGltaXplcih7XHJcbiAgICAgIHBuZzoge1xyXG4gICAgICAgIHF1YWxpdHk6IDc1LFxyXG4gICAgICB9LFxyXG4gICAgICBqcGVnOiB7XHJcbiAgICAgICAgcXVhbGl0eTogNzUsXHJcbiAgICAgIH0sXHJcbiAgICAgIGpwZzoge1xyXG4gICAgICAgIHF1YWxpdHk6IDc1LFxyXG4gICAgICB9LFxyXG4gICAgICB3ZWJwOiB7XHJcbiAgICAgICAgcXVhbGl0eTogNzUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHN2ZzogZmFsc2VcclxuICAgIH0pXHJcbiAgXSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHdhdGNoOiB7XHJcbiAgICAgIGlnbm9yZWQ6IFtcclxuICAgICAgICAnKiovKi5jcmRvd25sb2FkJyxcclxuICAgICAgICAnKiovKi50bXAnLFxyXG4gICAgICAgICcqKi8qLnBhcnQnLFxyXG4gICAgICAgICcqKi9ub2RlX21vZHVsZXMvKionLFxyXG4gICAgICAgICcqKi9zaG9lLWZpbmRlci8qKidcclxuICAgICAgXVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgaW5wdXQ6IHtcclxuICAgICAgICBtYWluOiByZXNvbHZlKHByb2Nlc3MuY3dkKCksICdpbmRleC5odG1sJyksXHJcbiAgICAgICAgY29ubmVjdGVkOiByZXNvbHZlKHByb2Nlc3MuY3dkKCksICdzdGF5LWNvbm5lY3RlZC5odG1sJyksXHJcbiAgICAgICAgdGVhbTogcmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAndGVhbS5odG1sJyksXHJcbiAgICAgICAgcGFzdDogcmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAncGFzdC1ldmVudHMuaHRtbCcpLFxyXG4gICAgICAgIHJlZ2lzdHJhdGlvbjogcmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAncmVnaXN0cmF0aW9uLmh0bWwnKSxcclxuICAgICAgICBjaGFubmVsczogcmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnY2hhbm5lbHMuaHRtbCcpLFxyXG4gICAgICAgIGVycm9yOiByZXNvbHZlKHByb2Nlc3MuY3dkKCksICc0MDQuaHRtbCcpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn0pO1xyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHNocml5XFxcXE9uZURyaXZlXFxcXERvY3VtZW50c1xcXFxtdW5zb2MyNiBuZXdcXFxcTVVOLUJoYXJnc1xcXFxhcGlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHNocml5XFxcXE9uZURyaXZlXFxcXERvY3VtZW50c1xcXFxtdW5zb2MyNiBuZXdcXFxcTVVOLUJoYXJnc1xcXFxhcGlcXFxcY3JlYXRlLXNoZWV0LmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9zaHJpeS9PbmVEcml2ZS9Eb2N1bWVudHMvbXVuc29jMjYlMjBuZXcvTVVOLUJoYXJncy9hcGkvY3JlYXRlLXNoZWV0LmpzXCI7aW1wb3J0IHsgZ29vZ2xlIH0gZnJvbSAnZ29vZ2xlYXBpcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIocmVxLCByZXMpIHtcbiAgLy8gQ09SUyBjb25maWd1cmF0aW9uXG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJywgdHJ1ZSk7XG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULE9QVElPTlMsUEFUQ0gsREVMRVRFLFBPU1QsUFVUJyk7XG4gIHJlcy5zZXRIZWFkZXIoXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLFxuICAgICdYLUNTUkYtVG9rZW4sIFgtUmVxdWVzdGVkLVdpdGgsIEFjY2VwdCwgQWNjZXB0LVZlcnNpb24sIENvbnRlbnQtTGVuZ3RoLCBDb250ZW50LU1ENSwgQ29udGVudC1UeXBlLCBEYXRlLCBYLUFwaS1WZXJzaW9uJ1xuICApO1xuXG4gIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcbiAgICByZXR1cm4gcmVzLnN0YXR1cygyMDApLmVuZCgpO1xuICB9XG5cbiAgaWYgKHJlcS5tZXRob2QgIT09ICdQT1NUJykge1xuICAgIHJldHVybiByZXMuc3RhdHVzKDQwNSkuanNvbih7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ01ldGhvZCBub3QgYWxsb3dlZC4gT25seSBQT1NUIGlzIHN1cHBvcnRlZC4nIH0pO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRlbGVnYXRpb25OYW1lLCBkZWxlZ2F0aW9uVHlwZSwgaGVhZE5hbWUsIGVtYWlsLCBwaG9uZSB9ID0gcmVxLmJvZHkgfHwge307XG5cbiAgICBpZiAoIWRlbGVnYXRpb25OYW1lIHx8ICFkZWxlZ2F0aW9uTmFtZS50cmltKCkpIHtcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbih7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0RlbGVnYXRpb24gTmFtZSBpcyByZXF1aXJlZC4nIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGlzSW50ZXJuYWwgPSAoZGVsZWdhdGlvblR5cGUgfHwgJycpLnRvTG93ZXJDYXNlKCkgPT09ICdpbnRlcm5hbCc7XG5cbiAgICAvLyBSTlMgTVVOIDI2IEhlYWRlcnNcbiAgICBjb25zdCBoZWFkZXJzID0gaXNJbnRlcm5hbFxuICAgICAgPyBbXG4gICAgICAgICAgJ1NsIE5vJyxcbiAgICAgICAgICAnTmFtZScsXG4gICAgICAgICAgJ1VTTicsXG4gICAgICAgICAgJ0NvbW1pdHRlZSBQcmVmZXJlbmNlIDEnLFxuICAgICAgICAgICdQb3J0Zm9saW8gUHJlZmVyZW5jZSAxJyxcbiAgICAgICAgICAnUG9ydGZvbGlvIFByZWZlcmVuY2UgMicsXG4gICAgICAgICAgJ1BvcnRmb2xpbyBQcmVmZXJlbmNlIDMnLFxuICAgICAgICAgICdDb21taXR0ZWUgUHJlZmVyZW5jZSAyJyxcbiAgICAgICAgICAnUG9ydGZvbGlvIFByZWZlcmVuY2UgMScsXG4gICAgICAgICAgJ1BvcnRmb2xpbyBQcmVmZXJlbmNlIDInLFxuICAgICAgICAgICdQb3J0Zm9saW8gUHJlZmVyZW5jZSAzJ1xuICAgICAgICBdXG4gICAgICA6IFtcbiAgICAgICAgICAnU2wgTm8nLFxuICAgICAgICAgICdOYW1lJyxcbiAgICAgICAgICAnSW5zdGl0dXRpb24nLFxuICAgICAgICAgICdVU04nLFxuICAgICAgICAgICdDb21taXR0ZWUgUHJlZmVyZW5jZSAxJyxcbiAgICAgICAgICAnUG9ydGZvbGlvIFByZWZlcmVuY2UgMScsXG4gICAgICAgICAgJ1BvcnRmb2xpbyBQcmVmZXJlbmNlIDInLFxuICAgICAgICAgICdQb3J0Zm9saW8gUHJlZmVyZW5jZSAzJyxcbiAgICAgICAgICAnQ29tbWl0dGVlIFByZWZlcmVuY2UgMicsXG4gICAgICAgICAgJ1BvcnRmb2xpbyBQcmVmZXJlbmNlIDEnLFxuICAgICAgICAgICdQb3J0Zm9saW8gUHJlZmVyZW5jZSAyJyxcbiAgICAgICAgICAnUG9ydGZvbGlvIFByZWZlcmVuY2UgMydcbiAgICAgICAgXTtcblxuICAgIGNvbnN0IHRpdGxlID0gYFJOUyBNVU4gMjYgLSAke2RlbGVnYXRpb25OYW1lLnRyaW0oKX0gUm9zdGVyYDtcblxuICAgIC8vIFBhcnNlIEdvb2dsZSBDcmVkZW50aWFscyBmcm9tIHByb2Nlc3MuZW52LkdPT0dMRV9TRVJWSUNFX0FDQ09VTlQgb3IgaW5kaXZpZHVhbCB2YXJzXG4gICAgbGV0IGNyZWRlbnRpYWxzID0gbnVsbDtcbiAgICBpZiAocHJvY2Vzcy5lbnYuR09PR0xFX1NFUlZJQ0VfQUNDT1VOVCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY3JlZGVudGlhbHMgPSB0eXBlb2YgcHJvY2Vzcy5lbnYuR09PR0xFX1NFUlZJQ0VfQUNDT1VOVCA9PT0gJ3N0cmluZydcbiAgICAgICAgICA/IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuR09PR0xFX1NFUlZJQ0VfQUNDT1VOVClcbiAgICAgICAgICA6IHByb2Nlc3MuZW52LkdPT0dMRV9TRVJWSUNFX0FDQ09VTlQ7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcGFyc2luZyBHT09HTEVfU0VSVklDRV9BQ0NPVU5UIEpTT046JywgZXJyKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHByb2Nlc3MuZW52LkdPT0dMRV9DTElFTlRfRU1BSUwgJiYgcHJvY2Vzcy5lbnYuR09PR0xFX1BSSVZBVEVfS0VZKSB7XG4gICAgICBjcmVkZW50aWFscyA9IHtcbiAgICAgICAgY2xpZW50X2VtYWlsOiBwcm9jZXNzLmVudi5HT09HTEVfQ0xJRU5UX0VNQUlMLFxuICAgICAgICBwcml2YXRlX2tleTogcHJvY2Vzcy5lbnYuR09PR0xFX1BSSVZBVEVfS0VZLnJlcGxhY2UoL1xcXFxuL2csICdcXG4nKSxcbiAgICAgICAgcHJvamVjdF9pZDogcHJvY2Vzcy5lbnYuR09PR0xFX1BST0pFQ1RfSURcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gR3JhY2VmdWwgZmFsbGJhY2sgZm9yIGxvY2FsIGRldmVsb3BtZW50IG9yIHVudGlsIGVudiBjcmVkZW50aWFscyBhcmUgcHJvdmlkZWRcbiAgICBpZiAoIWNyZWRlbnRpYWxzKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tJTkZPXSBHT09HTEVfU0VSVklDRV9BQ0NPVU5UIG5vdCBjb25maWd1cmVkIGluIGVudmlyb25tZW50LiBVc2luZyBmYWxsYmFjayBHb29nbGUgU2hlZXRzIHRlbXBsYXRlIGNyZWF0aW9uIFVSTC4nKTtcbiAgICAgIGNvbnN0IGVuY29kZWRUaXRsZSA9IGVuY29kZVVSSUNvbXBvbmVudCh0aXRsZSk7XG4gICAgICBjb25zdCBmYWxsYmFja1VybCA9IGBodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9zcHJlYWRzaGVldHMvY3JlYXRlP3RpdGxlPSR7ZW5jb2RlZFRpdGxlfWA7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cygyMDApLmpzb24oe1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICBzaGVldFVybDogZmFsbGJhY2tVcmwsXG4gICAgICAgIGlzRmFsbGJhY2s6IHRydWUsXG4gICAgICAgIG1lc3NhZ2U6ICdHb29nbGUgU2VydmljZSBBY2NvdW50IGNyZWRlbnRpYWxzIG5vdCBzZXQuIFJldHVybmVkIEdvb2dsZSBTaGVldHMgdGVtcGxhdGUgVVJMLidcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGF1dGggPSBuZXcgZ29vZ2xlLmF1dGguR29vZ2xlQXV0aCh7XG4gICAgICBjcmVkZW50aWFscyxcbiAgICAgIHNjb3BlczogW1xuICAgICAgICAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9zcHJlYWRzaGVldHMnLFxuICAgICAgICAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9kcml2ZScsXG4gICAgICAgICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL2RyaXZlLmZpbGUnXG4gICAgICBdXG4gICAgfSk7XG5cbiAgICBjb25zdCBzaGVldHMgPSBnb29nbGUuc2hlZXRzKHsgdmVyc2lvbjogJ3Y0JywgYXV0aCB9KTtcbiAgICBjb25zdCBkcml2ZSA9IGdvb2dsZS5kcml2ZSh7IHZlcnNpb246ICd2MycsIGF1dGggfSk7XG5cbiAgICAvLyAxLiBDcmVhdGUgU3ByZWFkc2hlZXRcbiAgICBjb25zdCBjcmVhdGVSZXNwb25zZSA9IGF3YWl0IHNoZWV0cy5zcHJlYWRzaGVldHMuY3JlYXRlKHtcbiAgICAgIHJlcXVlc3RCb2R5OiB7XG4gICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICB0aXRsZVxuICAgICAgICB9LFxuICAgICAgICBzaGVldHM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgIHRpdGxlOiAnRGVsZWdhdGVzIFJvc3RlcicsXG4gICAgICAgICAgICAgIGdyaWRQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgcm93Q291bnQ6IDEwMCxcbiAgICAgICAgICAgICAgICBjb2x1bW5Db3VudDogaGVhZGVycy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgZnJvemVuUm93Q291bnQ6IDFcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3Qgc3ByZWFkc2hlZXRJZCA9IGNyZWF0ZVJlc3BvbnNlLmRhdGEuc3ByZWFkc2hlZXRJZDtcbiAgICBjb25zdCBzaGVldFVybCA9IGNyZWF0ZVJlc3BvbnNlLmRhdGEuc3ByZWFkc2hlZXRVcmwgfHwgYGh0dHBzOi8vZG9jcy5nb29nbGUuY29tL3NwcmVhZHNoZWV0cy9kLyR7c3ByZWFkc2hlZXRJZH0vZWRpdGA7XG5cbiAgICAvLyAyLiBJbnNlcnQgSGVhZGVyIFJvd1xuICAgIGF3YWl0IHNoZWV0cy5zcHJlYWRzaGVldHMudmFsdWVzLnVwZGF0ZSh7XG4gICAgICBzcHJlYWRzaGVldElkLFxuICAgICAgcmFuZ2U6ICdEZWxlZ2F0ZXMgUm9zdGVyIUExJyxcbiAgICAgIHZhbHVlSW5wdXRPcHRpb246ICdSQVcnLFxuICAgICAgcmVxdWVzdEJvZHk6IHtcbiAgICAgICAgdmFsdWVzOiBbaGVhZGVyc11cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIDMuIEdyYW50IFdyaXRlciBhY2Nlc3MgdG8gYW55b25lIHdpdGggbGluayBzbyBkZWxlZ2F0aW9uIGhlYWQgY2FuIGZpbGwgdGhlIHJvc3RlclxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBkcml2ZS5wZXJtaXNzaW9ucy5jcmVhdGUoe1xuICAgICAgICBmaWxlSWQ6IHNwcmVhZHNoZWV0SWQsXG4gICAgICAgIHJlcXVlc3RCb2R5OiB7XG4gICAgICAgICAgcm9sZTogJ3dyaXRlcicsXG4gICAgICAgICAgdHlwZTogJ2FueW9uZSdcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAocGVybUVycm9yKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ0NvdWxkIG5vdCBzZXQgYW55b25lIHBlcm1pc3Npb24gb24gc2hlZXQ6JywgcGVybUVycm9yLm1lc3NhZ2UpO1xuICAgIH1cblxuICAgIHJldHVybiByZXMuc3RhdHVzKDIwMCkuanNvbih7XG4gICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgc2hlZXRVcmwsXG4gICAgICBzcHJlYWRzaGVldElkXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgY3JlYXRpbmcgR29vZ2xlIFNoZWV0OicsIGVycm9yKTtcbiAgICByZXR1cm4gcmVzLnN0YXR1cyg1MDApLmpzb24oe1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIGNyZWF0ZSBHb29nbGUgU2hlZXQnXG4gICAgfSk7XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlcsU0FBUyxvQkFBb0I7QUFDMVksU0FBUyxlQUFlO0FBQ3hCLFNBQVMsMEJBQTBCOzs7QUNGMFYsU0FBUyxjQUFjO0FBRXBaLGVBQU8sUUFBK0IsS0FBSyxLQUFLO0FBRTlDLE1BQUks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
