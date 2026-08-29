// vite.config.js
import { defineConfig } from "file:///C:/Users/Admin/Downloads/MUN-Bhargs/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
import { ViteImageOptimizer } from "file:///C:/Users/Admin/Downloads/MUN-Bhargs/node_modules/vite-plugin-image-optimizer/dist/index.js";

// api/create-sheet.js
import { google } from "file:///C:/Users/Admin/Downloads/MUN-Bhargs/node_modules/googleapis/build/src/index.js";
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
      "Delegate Name",
      "Email Address",
      "WhatsApp / Mobile Number",
      "USN / Roll No",
      "Committee Preference 1",
      "Portfolio Preference 1",
      "Portfolio Preference 2",
      "Portfolio Preference 3",
      "Committee Preference 2",
      "Comm 2 - Portfolio Preference 1",
      "Comm 2 - Portfolio Preference 2",
      "Comm 2 - Portfolio Preference 3"
    ] : [
      "Sl No",
      "Delegate Name",
      "Email Address",
      "WhatsApp / Mobile Number",
      "Institution / College Name",
      "USN / Roll No",
      "Committee Preference 1",
      "Portfolio Preference 1",
      "Portfolio Preference 2",
      "Portfolio Preference 3",
      "Committee Preference 2",
      "Comm 2 - Portfolio Preference 1",
      "Comm 2 - Portfolio Preference 2",
      "Comm 2 - Portfolio Preference 3"
    ];
    const headRow = isInternal ? [
      "1",
      headName ? `${headName.trim()} (Head of Delegation)` : "Head of Delegation",
      email ? email.trim() : "",
      phone ? phone.trim() : "",
      "",
      // USN / Roll No (blank for user)
      "",
      // Committee Preference 1
      "",
      // Portfolio Preference 1
      "",
      // Portfolio Preference 2
      "",
      // Portfolio Preference 3
      "",
      // Committee Preference 2
      "",
      // Comm 2 - Portfolio Preference 1
      "",
      // Comm 2 - Portfolio Preference 2
      ""
      // Comm 2 - Portfolio Preference 3
    ] : [
      "1",
      headName ? `${headName.trim()} (Head of Delegation)` : "Head of Delegation",
      email ? email.trim() : "",
      phone ? phone.trim() : "",
      delegationName ? delegationName.trim() : "",
      "",
      // USN / Roll No (blank for user)
      "",
      // Committee Preference 1
      "",
      // Portfolio Preference 1
      "",
      // Portfolio Preference 2
      "",
      // Portfolio Preference 3
      "",
      // Committee Preference 2
      "",
      // Comm 2 - Portfolio Preference 1
      "",
      // Comm 2 - Portfolio Preference 2
      ""
      // Comm 2 - Portfolio Preference 3
    ];
    const title = `RNS MUN 26 - ${delegationName.trim()} Roster`;
    const gasEndpoint = process.env.GOOGLE_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbxE1kr1fAjSP4JiNyRQYu-JU9vMk61chP6YGX_rG2n-5M7iTMz4oE1UJpsIfN5d5f1VRw/exec";
    if (gasEndpoint) {
      try {
        const gasResponse = await fetch(gasEndpoint, {
          method: "POST",
          redirect: "follow",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            delegationName,
            delegationType,
            headName,
            email,
            phone,
            headers,
            headRow,
            ownerEmail: "mun@rnsit.ac.in"
          })
        });
        const rawText = await gasResponse.text();
        try {
          const gasData = JSON.parse(rawText);
          if (gasData && gasData.sheetUrl) {
            return res.status(200).json({
              success: true,
              sheetUrl: gasData.sheetUrl,
              headers,
              headRow
            });
          }
        } catch (jsonErr) {
          console.warn('Google Apps Script returned HTML instead of JSON. Ensure "Who has access" is set to "Anyone" in Apps Script deployment.');
        }
      } catch (gasErr) {
        console.warn("Google Apps Script proxy notice:", gasErr.message);
      }
    }
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
      console.warn("[INFO] GOOGLE_SERVICE_ACCOUNT not configured. Returning formatted client template & copy payload for mun@rnsit.ac.in.");
      const encodedTitle = encodeURIComponent(title);
      const fallbackUrl = `https://docs.google.com/spreadsheets/create?title=${encodedTitle}`;
      return res.status(200).json({
        success: true,
        sheetUrl: fallbackUrl,
        headers,
        headRow,
        isFallback: true,
        message: "Google Sheet payload ready. Row 1 (Headers) and Row 2 (Head of Delegation) generated."
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
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`;
    const rows = [
      headers,
      headRow
    ];
    for (let i = 2; i <= 18; i++) {
      rows.push([`${i}`, "", "", "", "", "", "", "", "", "", ""]);
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Delegates Roster!A1",
      valueInputOption: "RAW",
      requestBody: {
        values: rows
      }
    });
    if (email && email.trim() && /^\S+@\S+\.\S+$/.test(email.trim())) {
      try {
        await drive.permissions.create({
          fileId: spreadsheetId,
          sendNotificationEmail: false,
          requestBody: {
            role: "writer",
            type: "user",
            emailAddress: email.trim()
          }
        });
      } catch (userPermErr) {
        console.warn("Could not share edit permission directly with user email:", userPermErr.message);
      }
    }
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: "writer",
          type: "user",
          emailAddress: "mun@rnsit.ac.in"
        }
      });
    } catch (munErr) {
      console.warn("Could not share with mun@rnsit.ac.in:", munErr.message);
    }
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: "writer",
          type: "anyone",
          allowFileDiscovery: false
        }
      });
    } catch (permError) {
      console.warn("Could not set anyone edit permission on sheet:", permError.message);
    }
    return res.status(200).json({
      success: true,
      sheetUrl,
      spreadsheetId,
      headers,
      headRow
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAiYXBpL2NyZWF0ZS1zaGVldC5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEFkbWluXFxcXERvd25sb2Fkc1xcXFxNVU4tQmhhcmdzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZG1pblxcXFxEb3dubG9hZHNcXFxcTVVOLUJoYXJnc1xcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvQWRtaW4vRG93bmxvYWRzL01VTi1CaGFyZ3Mvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBWaXRlSW1hZ2VPcHRpbWl6ZXIgfSBmcm9tICd2aXRlLXBsdWdpbi1pbWFnZS1vcHRpbWl6ZXInO1xyXG5cclxuaW1wb3J0IGNyZWF0ZVNoZWV0SGFuZGxlciBmcm9tICcuL2FwaS9jcmVhdGUtc2hlZXQuanMnO1xyXG5cclxuY29uc3QgY2xlYW5VcmxzUGx1Z2luID0gKCkgPT4gKHtcclxuICBuYW1lOiAnY2xlYW4tdXJscycsXHJcbiAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xyXG4gICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgY29uc3QgdXJsID0gcmVxLnVybC5zcGxpdCgnPycpWzBdO1xyXG5cclxuICAgICAgaWYgKHVybCA9PT0gJy9hcGkvY3JlYXRlLXNoZWV0Jykge1xyXG4gICAgICAgIGxldCBib2R5ID0gJyc7XHJcbiAgICAgICAgcmVxLm9uKCdkYXRhJywgY2h1bmsgPT4geyBib2R5ICs9IGNodW5rOyB9KTtcclxuICAgICAgICByZXEub24oJ2VuZCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHJlcS5ib2R5ID0gYm9keSA/IEpTT04ucGFyc2UoYm9keSkgOiB7fTtcclxuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgcmVxLmJvZHkgPSB7fTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJlcy5zdGF0dXMgPSAoY29kZSkgPT4ge1xyXG4gICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IGNvZGU7XHJcbiAgICAgICAgICAgIHJldHVybiByZXM7XHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgICAgcmVzLmpzb24gPSAoZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xyXG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlcztcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBjcmVhdGVTaGVldEhhbmRsZXIocmVxLCByZXMpO1xyXG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xyXG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBoYXNFeHRlbnNpb24gPSAvXFwuW2EtekEtWjAtOV0rJC8udGVzdCh1cmwpO1xyXG4gICAgICBcclxuICAgICAgaWYgKCFoYXNFeHRlbnNpb24pIHtcclxuICAgICAgICBpZiAodXJsID09PSAnL3RlYW0nKSB7XHJcbiAgICAgICAgICByZXEudXJsID0gJy90ZWFtLmh0bWwnICsgcmVxLnVybC5zdWJzdHJpbmcoNSk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh1cmwgPT09ICcvc3RheS1jb25uZWN0ZWQnKSB7XHJcbiAgICAgICAgICByZXEudXJsID0gJy9zdGF5LWNvbm5lY3RlZC5odG1sJyArIHJlcS51cmwuc3Vic3RyaW5nKDE1KTtcclxuICAgICAgICB9IGVsc2UgaWYgKHVybCA9PT0gJy9wYXN0LWV2ZW50cycpIHtcclxuICAgICAgICAgIHJlcS51cmwgPSAnL3Bhc3QtZXZlbnRzLmh0bWwnICsgcmVxLnVybC5zdWJzdHJpbmcoMTIpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodXJsID09PSAnL3JlZ2lzdHJhdGlvbicpIHtcclxuICAgICAgICAgIHJlcS51cmwgPSAnL3JlZ2lzdHJhdGlvbi5odG1sJyArIHJlcS51cmwuc3Vic3RyaW5nKDEzKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHVybCA9PT0gJy9jaGFubmVscycpIHtcclxuICAgICAgICAgIHJlcS51cmwgPSAnL2NoYW5uZWxzLmh0bWwnICsgcmVxLnVybC5zdWJzdHJpbmcoOSk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh1cmwgPT09ICcvNDA0Jykge1xyXG4gICAgICAgICAgcmVxLnVybCA9ICcvNDA0Lmh0bWwnICsgcmVxLnVybC5zdWJzdHJpbmcoNCk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh1cmwgIT09ICcvJyAmJiB1cmwgIT09ICcnKSB7XHJcbiAgICAgICAgICAvLyBTZXJ2ZSBjdXN0b20gNDA0IHBhZ2UgZm9yIGFueSB1bm1hdGNoZWQgcGFnZSByb3V0ZXNcclxuICAgICAgICAgIHJlcS51cmwgPSAnLzQwNC5odG1sJztcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgbmV4dCgpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59KTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW1xyXG4gICAgY2xlYW5VcmxzUGx1Z2luKCksXHJcbiAgICBWaXRlSW1hZ2VPcHRpbWl6ZXIoe1xyXG4gICAgICBwbmc6IHtcclxuICAgICAgICBxdWFsaXR5OiA3NSxcclxuICAgICAgfSxcclxuICAgICAganBlZzoge1xyXG4gICAgICAgIHF1YWxpdHk6IDc1LFxyXG4gICAgICB9LFxyXG4gICAgICBqcGc6IHtcclxuICAgICAgICBxdWFsaXR5OiA3NSxcclxuICAgICAgfSxcclxuICAgICAgd2VicDoge1xyXG4gICAgICAgIHF1YWxpdHk6IDc1LFxyXG4gICAgICB9LFxyXG4gICAgICBzdmc6IGZhbHNlXHJcbiAgICB9KVxyXG4gIF0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICB3YXRjaDoge1xyXG4gICAgICBpZ25vcmVkOiBbXHJcbiAgICAgICAgJyoqLyouY3Jkb3dubG9hZCcsXHJcbiAgICAgICAgJyoqLyoudG1wJyxcclxuICAgICAgICAnKiovKi5wYXJ0JyxcclxuICAgICAgICAnKiovbm9kZV9tb2R1bGVzLyoqJyxcclxuICAgICAgICAnKiovc2hvZS1maW5kZXIvKionXHJcbiAgICAgIF1cclxuICAgIH1cclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIGlucHV0OiB7XHJcbiAgICAgICAgbWFpbjogcmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnaW5kZXguaHRtbCcpLFxyXG4gICAgICAgIGNvbm5lY3RlZDogcmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnc3RheS1jb25uZWN0ZWQuaHRtbCcpLFxyXG4gICAgICAgIHRlYW06IHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ3RlYW0uaHRtbCcpLFxyXG4gICAgICAgIHBhc3Q6IHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ3Bhc3QtZXZlbnRzLmh0bWwnKSxcclxuICAgICAgICByZWdpc3RyYXRpb246IHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ3JlZ2lzdHJhdGlvbi5odG1sJyksXHJcbiAgICAgICAgY2hhbm5lbHM6IHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ2NoYW5uZWxzLmh0bWwnKSxcclxuICAgICAgICBlcnJvcjogcmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnNDA0Lmh0bWwnKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59KTtcclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZG1pblxcXFxEb3dubG9hZHNcXFxcTVVOLUJoYXJnc1xcXFxhcGlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEFkbWluXFxcXERvd25sb2Fkc1xcXFxNVU4tQmhhcmdzXFxcXGFwaVxcXFxjcmVhdGUtc2hlZXQuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0FkbWluL0Rvd25sb2Fkcy9NVU4tQmhhcmdzL2FwaS9jcmVhdGUtc2hlZXQuanNcIjtpbXBvcnQgeyBnb29nbGUgfSBmcm9tICdnb29nbGVhcGlzJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIocmVxLCByZXMpIHtcclxuICAvLyBDT1JTIGNvbmZpZ3VyYXRpb25cclxuICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFscycsIHRydWUpO1xyXG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XHJcbiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdHRVQsT1BUSU9OUyxQQVRDSCxERUxFVEUsUE9TVCxQVVQnKTtcclxuICByZXMuc2V0SGVhZGVyKFxyXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLFxyXG4gICAgJ1gtQ1NSRi1Ub2tlbiwgWC1SZXF1ZXN0ZWQtV2l0aCwgQWNjZXB0LCBBY2NlcHQtVmVyc2lvbiwgQ29udGVudC1MZW5ndGgsIENvbnRlbnQtTUQ1LCBDb250ZW50LVR5cGUsIERhdGUsIFgtQXBpLVZlcnNpb24nXHJcbiAgKTtcclxuXHJcbiAgaWYgKHJlcS5tZXRob2QgPT09ICdPUFRJT05TJykge1xyXG4gICAgcmV0dXJuIHJlcy5zdGF0dXMoMjAwKS5lbmQoKTtcclxuICB9XHJcblxyXG4gIGlmIChyZXEubWV0aG9kICE9PSAnUE9TVCcpIHtcclxuICAgIHJldHVybiByZXMuc3RhdHVzKDQwNSkuanNvbih7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ01ldGhvZCBub3QgYWxsb3dlZC4gT25seSBQT1NUIGlzIHN1cHBvcnRlZC4nIH0pO1xyXG4gIH1cclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHsgZGVsZWdhdGlvbk5hbWUsIGRlbGVnYXRpb25UeXBlLCBoZWFkTmFtZSwgZW1haWwsIHBob25lIH0gPSByZXEuYm9keSB8fCB7fTtcclxuXHJcbiAgICBpZiAoIWRlbGVnYXRpb25OYW1lIHx8ICFkZWxlZ2F0aW9uTmFtZS50cmltKCkpIHtcclxuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRGVsZWdhdGlvbiBOYW1lIGlzIHJlcXVpcmVkLicgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgaXNJbnRlcm5hbCA9IChkZWxlZ2F0aW9uVHlwZSB8fCAnJykudG9Mb3dlckNhc2UoKSA9PT0gJ2ludGVybmFsJztcclxuXHJcbiAgICAvLyBSTlMgTVVOIDI2IE9mZmljaWFsIFN0YW5kYXJkIEhlYWRlcnMgKHdpdGggRW1haWwgJiBXaGF0c0FwcClcclxuICAgIGNvbnN0IGhlYWRlcnMgPSBpc0ludGVybmFsXHJcbiAgICAgID8gW1xyXG4gICAgICAgICAgJ1NsIE5vJyxcclxuICAgICAgICAgICdEZWxlZ2F0ZSBOYW1lJyxcclxuICAgICAgICAgICdFbWFpbCBBZGRyZXNzJyxcclxuICAgICAgICAgICdXaGF0c0FwcCAvIE1vYmlsZSBOdW1iZXInLFxyXG4gICAgICAgICAgJ1VTTiAvIFJvbGwgTm8nLFxyXG4gICAgICAgICAgJ0NvbW1pdHRlZSBQcmVmZXJlbmNlIDEnLFxyXG4gICAgICAgICAgJ1BvcnRmb2xpbyBQcmVmZXJlbmNlIDEnLFxyXG4gICAgICAgICAgJ1BvcnRmb2xpbyBQcmVmZXJlbmNlIDInLFxyXG4gICAgICAgICAgJ1BvcnRmb2xpbyBQcmVmZXJlbmNlIDMnLFxyXG4gICAgICAgICAgJ0NvbW1pdHRlZSBQcmVmZXJlbmNlIDInLFxyXG4gICAgICAgICAgJ0NvbW0gMiAtIFBvcnRmb2xpbyBQcmVmZXJlbmNlIDEnLFxyXG4gICAgICAgICAgJ0NvbW0gMiAtIFBvcnRmb2xpbyBQcmVmZXJlbmNlIDInLFxyXG4gICAgICAgICAgJ0NvbW0gMiAtIFBvcnRmb2xpbyBQcmVmZXJlbmNlIDMnXHJcbiAgICAgICAgXVxyXG4gICAgICA6IFtcclxuICAgICAgICAgICdTbCBObycsXHJcbiAgICAgICAgICAnRGVsZWdhdGUgTmFtZScsXHJcbiAgICAgICAgICAnRW1haWwgQWRkcmVzcycsXHJcbiAgICAgICAgICAnV2hhdHNBcHAgLyBNb2JpbGUgTnVtYmVyJyxcclxuICAgICAgICAgICdJbnN0aXR1dGlvbiAvIENvbGxlZ2UgTmFtZScsXHJcbiAgICAgICAgICAnVVNOIC8gUm9sbCBObycsXHJcbiAgICAgICAgICAnQ29tbWl0dGVlIFByZWZlcmVuY2UgMScsXHJcbiAgICAgICAgICAnUG9ydGZvbGlvIFByZWZlcmVuY2UgMScsXHJcbiAgICAgICAgICAnUG9ydGZvbGlvIFByZWZlcmVuY2UgMicsXHJcbiAgICAgICAgICAnUG9ydGZvbGlvIFByZWZlcmVuY2UgMycsXHJcbiAgICAgICAgICAnQ29tbWl0dGVlIFByZWZlcmVuY2UgMicsXHJcbiAgICAgICAgICAnQ29tbSAyIC0gUG9ydGZvbGlvIFByZWZlcmVuY2UgMScsXHJcbiAgICAgICAgICAnQ29tbSAyIC0gUG9ydGZvbGlvIFByZWZlcmVuY2UgMicsXHJcbiAgICAgICAgICAnQ29tbSAyIC0gUG9ydGZvbGlvIFByZWZlcmVuY2UgMydcclxuICAgICAgICBdO1xyXG5cclxuICAgIC8vIFByZXBhcmUgUm93IDI6IFByZS1maWxsIEhlYWQgb2YgRGVsZWdhdGlvbiBOYW1lLCBFbWFpbCwgYW5kIFBob25lIVxyXG4gICAgY29uc3QgaGVhZFJvdyA9IGlzSW50ZXJuYWxcclxuICAgICAgPyBbXHJcbiAgICAgICAgICAnMScsXHJcbiAgICAgICAgICBoZWFkTmFtZSA/IGAke2hlYWROYW1lLnRyaW0oKX0gKEhlYWQgb2YgRGVsZWdhdGlvbilgIDogJ0hlYWQgb2YgRGVsZWdhdGlvbicsXHJcbiAgICAgICAgICBlbWFpbCA/IGVtYWlsLnRyaW0oKSA6ICcnLFxyXG4gICAgICAgICAgcGhvbmUgPyBwaG9uZS50cmltKCkgOiAnJyxcclxuICAgICAgICAgICcnLCAvLyBVU04gLyBSb2xsIE5vIChibGFuayBmb3IgdXNlcilcclxuICAgICAgICAgICcnLCAvLyBDb21taXR0ZWUgUHJlZmVyZW5jZSAxXHJcbiAgICAgICAgICAnJywgLy8gUG9ydGZvbGlvIFByZWZlcmVuY2UgMVxyXG4gICAgICAgICAgJycsIC8vIFBvcnRmb2xpbyBQcmVmZXJlbmNlIDJcclxuICAgICAgICAgICcnLCAvLyBQb3J0Zm9saW8gUHJlZmVyZW5jZSAzXHJcbiAgICAgICAgICAnJywgLy8gQ29tbWl0dGVlIFByZWZlcmVuY2UgMlxyXG4gICAgICAgICAgJycsIC8vIENvbW0gMiAtIFBvcnRmb2xpbyBQcmVmZXJlbmNlIDFcclxuICAgICAgICAgICcnLCAvLyBDb21tIDIgLSBQb3J0Zm9saW8gUHJlZmVyZW5jZSAyXHJcbiAgICAgICAgICAnJyAgLy8gQ29tbSAyIC0gUG9ydGZvbGlvIFByZWZlcmVuY2UgM1xyXG4gICAgICAgIF1cclxuICAgICAgOiBbXHJcbiAgICAgICAgICAnMScsXHJcbiAgICAgICAgICBoZWFkTmFtZSA/IGAke2hlYWROYW1lLnRyaW0oKX0gKEhlYWQgb2YgRGVsZWdhdGlvbilgIDogJ0hlYWQgb2YgRGVsZWdhdGlvbicsXHJcbiAgICAgICAgICBlbWFpbCA/IGVtYWlsLnRyaW0oKSA6ICcnLFxyXG4gICAgICAgICAgcGhvbmUgPyBwaG9uZS50cmltKCkgOiAnJyxcclxuICAgICAgICAgIGRlbGVnYXRpb25OYW1lID8gZGVsZWdhdGlvbk5hbWUudHJpbSgpIDogJycsXHJcbiAgICAgICAgICAnJywgLy8gVVNOIC8gUm9sbCBObyAoYmxhbmsgZm9yIHVzZXIpXHJcbiAgICAgICAgICAnJywgLy8gQ29tbWl0dGVlIFByZWZlcmVuY2UgMVxyXG4gICAgICAgICAgJycsIC8vIFBvcnRmb2xpbyBQcmVmZXJlbmNlIDFcclxuICAgICAgICAgICcnLCAvLyBQb3J0Zm9saW8gUHJlZmVyZW5jZSAyXHJcbiAgICAgICAgICAnJywgLy8gUG9ydGZvbGlvIFByZWZlcmVuY2UgM1xyXG4gICAgICAgICAgJycsIC8vIENvbW1pdHRlZSBQcmVmZXJlbmNlIDJcclxuICAgICAgICAgICcnLCAvLyBDb21tIDIgLSBQb3J0Zm9saW8gUHJlZmVyZW5jZSAxXHJcbiAgICAgICAgICAnJywgLy8gQ29tbSAyIC0gUG9ydGZvbGlvIFByZWZlcmVuY2UgMlxyXG4gICAgICAgICAgJycgIC8vIENvbW0gMiAtIFBvcnRmb2xpbyBQcmVmZXJlbmNlIDNcclxuICAgICAgICBdO1xyXG5cclxuICAgIGNvbnN0IHRpdGxlID0gYFJOUyBNVU4gMjYgLSAke2RlbGVnYXRpb25OYW1lLnRyaW0oKX0gUm9zdGVyYDtcclxuXHJcbiAgICAvLyAxLiBHb29nbGUgQXBwcyBTY3JpcHQgV2ViaG9vayBVUkxcclxuICAgIGNvbnN0IGdhc0VuZHBvaW50ID0gcHJvY2Vzcy5lbnYuR09PR0xFX0FQUFNfU0NSSVBUX1VSTCB8fCAnaHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J4RTFrcjFmQWpTUDRKaU55UlFZdS1KVTl2TWs2MWNoUDZZR1hfckcybi01TTdpVE16NG9FMVVKcHNJZk41ZDVmMVZSdy9leGVjJztcclxuICAgIGlmIChnYXNFbmRwb2ludCkge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IGdhc1Jlc3BvbnNlID0gYXdhaXQgZmV0Y2goZ2FzRW5kcG9pbnQsIHtcclxuICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgcmVkaXJlY3Q6ICdmb2xsb3cnLFxyXG4gICAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW47Y2hhcnNldD11dGYtOCcgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgZGVsZWdhdGlvbk5hbWUsXHJcbiAgICAgICAgICAgIGRlbGVnYXRpb25UeXBlLFxyXG4gICAgICAgICAgICBoZWFkTmFtZSxcclxuICAgICAgICAgICAgZW1haWwsXHJcbiAgICAgICAgICAgIHBob25lLFxyXG4gICAgICAgICAgICBoZWFkZXJzLFxyXG4gICAgICAgICAgICBoZWFkUm93LFxyXG4gICAgICAgICAgICBvd25lckVtYWlsOiAnbXVuQHJuc2l0LmFjLmluJ1xyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9KTtcclxuICAgICAgICBjb25zdCByYXdUZXh0ID0gYXdhaXQgZ2FzUmVzcG9uc2UudGV4dCgpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICBjb25zdCBnYXNEYXRhID0gSlNPTi5wYXJzZShyYXdUZXh0KTtcclxuICAgICAgICAgIGlmIChnYXNEYXRhICYmIGdhc0RhdGEuc2hlZXRVcmwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoMjAwKS5qc29uKHtcclxuICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgIHNoZWV0VXJsOiBnYXNEYXRhLnNoZWV0VXJsLFxyXG4gICAgICAgICAgICAgIGhlYWRlcnMsXHJcbiAgICAgICAgICAgICAgaGVhZFJvd1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChqc29uRXJyKSB7XHJcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ0dvb2dsZSBBcHBzIFNjcmlwdCByZXR1cm5lZCBIVE1MIGluc3RlYWQgb2YgSlNPTi4gRW5zdXJlIFwiV2hvIGhhcyBhY2Nlc3NcIiBpcyBzZXQgdG8gXCJBbnlvbmVcIiBpbiBBcHBzIFNjcmlwdCBkZXBsb3ltZW50LicpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBjYXRjaCAoZ2FzRXJyKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKCdHb29nbGUgQXBwcyBTY3JpcHQgcHJveHkgbm90aWNlOicsIGdhc0Vyci5tZXNzYWdlKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFBhcnNlIEdvb2dsZSBDcmVkZW50aWFscyBmcm9tIHByb2Nlc3MuZW52LkdPT0dMRV9TRVJWSUNFX0FDQ09VTlQgb3IgaW5kaXZpZHVhbCB2YXJzXHJcbiAgICBsZXQgY3JlZGVudGlhbHMgPSBudWxsO1xyXG4gICAgaWYgKHByb2Nlc3MuZW52LkdPT0dMRV9TRVJWSUNFX0FDQ09VTlQpIHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjcmVkZW50aWFscyA9IHR5cGVvZiBwcm9jZXNzLmVudi5HT09HTEVfU0VSVklDRV9BQ0NPVU5UID09PSAnc3RyaW5nJ1xyXG4gICAgICAgICAgPyBKU09OLnBhcnNlKHByb2Nlc3MuZW52LkdPT0dMRV9TRVJWSUNFX0FDQ09VTlQpXHJcbiAgICAgICAgICA6IHByb2Nlc3MuZW52LkdPT0dMRV9TRVJWSUNFX0FDQ09VTlQ7XHJcbiAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHBhcnNpbmcgR09PR0xFX1NFUlZJQ0VfQUNDT1VOVCBKU09OOicsIGVycik7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSBpZiAocHJvY2Vzcy5lbnYuR09PR0xFX0NMSUVOVF9FTUFJTCAmJiBwcm9jZXNzLmVudi5HT09HTEVfUFJJVkFURV9LRVkpIHtcclxuICAgICAgY3JlZGVudGlhbHMgPSB7XHJcbiAgICAgICAgY2xpZW50X2VtYWlsOiBwcm9jZXNzLmVudi5HT09HTEVfQ0xJRU5UX0VNQUlMLFxyXG4gICAgICAgIHByaXZhdGVfa2V5OiBwcm9jZXNzLmVudi5HT09HTEVfUFJJVkFURV9LRVkucmVwbGFjZSgvXFxcXG4vZywgJ1xcbicpLFxyXG4gICAgICAgIHByb2plY3RfaWQ6IHByb2Nlc3MuZW52LkdPT0dMRV9QUk9KRUNUX0lEXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR3JhY2VmdWwgZmFsbGJhY2sgZm9yIGxvY2FsIGRldmVsb3BtZW50IG9yIHVudGlsIGVudiBjcmVkZW50aWFscyBhcmUgcHJvdmlkZWRcclxuICAgIGlmICghY3JlZGVudGlhbHMpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdbSU5GT10gR09PR0xFX1NFUlZJQ0VfQUNDT1VOVCBub3QgY29uZmlndXJlZC4gUmV0dXJuaW5nIGZvcm1hdHRlZCBjbGllbnQgdGVtcGxhdGUgJiBjb3B5IHBheWxvYWQgZm9yIG11bkBybnNpdC5hYy5pbi4nKTtcclxuICAgICAgY29uc3QgZW5jb2RlZFRpdGxlID0gZW5jb2RlVVJJQ29tcG9uZW50KHRpdGxlKTtcclxuICAgICAgY29uc3QgZmFsbGJhY2tVcmwgPSBgaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vc3ByZWFkc2hlZXRzL2NyZWF0ZT90aXRsZT0ke2VuY29kZWRUaXRsZX1gO1xyXG4gICAgICByZXR1cm4gcmVzLnN0YXR1cygyMDApLmpzb24oe1xyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgc2hlZXRVcmw6IGZhbGxiYWNrVXJsLFxyXG4gICAgICAgIGhlYWRlcnMsXHJcbiAgICAgICAgaGVhZFJvdyxcclxuICAgICAgICBpc0ZhbGxiYWNrOiB0cnVlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdHb29nbGUgU2hlZXQgcGF5bG9hZCByZWFkeS4gUm93IDEgKEhlYWRlcnMpIGFuZCBSb3cgMiAoSGVhZCBvZiBEZWxlZ2F0aW9uKSBnZW5lcmF0ZWQuJ1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBhdXRoID0gbmV3IGdvb2dsZS5hdXRoLkdvb2dsZUF1dGgoe1xyXG4gICAgICBjcmVkZW50aWFscyxcclxuICAgICAgc2NvcGVzOiBbXHJcbiAgICAgICAgJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvc3ByZWFkc2hlZXRzJyxcclxuICAgICAgICAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9kcml2ZScsXHJcbiAgICAgICAgJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvZHJpdmUuZmlsZSdcclxuICAgICAgXVxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgc2hlZXRzID0gZ29vZ2xlLnNoZWV0cyh7IHZlcnNpb246ICd2NCcsIGF1dGggfSk7XHJcbiAgICBjb25zdCBkcml2ZSA9IGdvb2dsZS5kcml2ZSh7IHZlcnNpb246ICd2MycsIGF1dGggfSk7XHJcblxyXG4gICAgLy8gMS4gQ3JlYXRlIFNwcmVhZHNoZWV0XHJcbiAgICBjb25zdCBjcmVhdGVSZXNwb25zZSA9IGF3YWl0IHNoZWV0cy5zcHJlYWRzaGVldHMuY3JlYXRlKHtcclxuICAgICAgcmVxdWVzdEJvZHk6IHtcclxuICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICB0aXRsZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2hlZXRzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICB0aXRsZTogJ0RlbGVnYXRlcyBSb3N0ZXInLFxyXG4gICAgICAgICAgICAgIGdyaWRQcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICByb3dDb3VudDogMTAwLFxyXG4gICAgICAgICAgICAgICAgY29sdW1uQ291bnQ6IGhlYWRlcnMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgZnJvemVuUm93Q291bnQ6IDFcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICBdXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHNwcmVhZHNoZWV0SWQgPSBjcmVhdGVSZXNwb25zZS5kYXRhLnNwcmVhZHNoZWV0SWQ7XHJcbiAgICBjb25zdCBzaGVldFVybCA9IGBodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9zcHJlYWRzaGVldHMvZC8ke3NwcmVhZHNoZWV0SWR9L2VkaXQ/dXNwPXNoYXJpbmdgO1xyXG5cclxuICAgIC8vIDIuIEluc2VydCBIZWFkZXIgUm93IChSb3cgMSkgYW5kIEhlYWQgb2YgRGVsZWdhdGlvbiAoUm93IDIpICsgbnVtYmVyZWQgcm93cyAoMy4uMTgpXHJcbiAgICBjb25zdCByb3dzID0gW1xyXG4gICAgICBoZWFkZXJzLFxyXG4gICAgICBoZWFkUm93XHJcbiAgICBdO1xyXG4gICAgZm9yIChsZXQgaSA9IDI7IGkgPD0gMTg7IGkrKykge1xyXG4gICAgICByb3dzLnB1c2goW2Ake2l9YCwgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJyddKTtcclxuICAgIH1cclxuXHJcbiAgICBhd2FpdCBzaGVldHMuc3ByZWFkc2hlZXRzLnZhbHVlcy51cGRhdGUoe1xyXG4gICAgICBzcHJlYWRzaGVldElkLFxyXG4gICAgICByYW5nZTogJ0RlbGVnYXRlcyBSb3N0ZXIhQTEnLFxyXG4gICAgICB2YWx1ZUlucHV0T3B0aW9uOiAnUkFXJyxcclxuICAgICAgcmVxdWVzdEJvZHk6IHtcclxuICAgICAgICB2YWx1ZXM6IHJvd3NcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gMy4gR3JhbnQgV3JpdGVyIChFZGl0IEFjY2VzcykgZGlyZWN0bHkgdG8gdGhlIFVzZXIgLyBEZWxlZ2F0aW9uIEhlYWQncyBlbWFpbFxyXG4gICAgaWYgKGVtYWlsICYmIGVtYWlsLnRyaW0oKSAmJiAvXlxcUytAXFxTK1xcLlxcUyskLy50ZXN0KGVtYWlsLnRyaW0oKSkpIHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBhd2FpdCBkcml2ZS5wZXJtaXNzaW9ucy5jcmVhdGUoe1xyXG4gICAgICAgICAgZmlsZUlkOiBzcHJlYWRzaGVldElkLFxyXG4gICAgICAgICAgc2VuZE5vdGlmaWNhdGlvbkVtYWlsOiBmYWxzZSxcclxuICAgICAgICAgIHJlcXVlc3RCb2R5OiB7XHJcbiAgICAgICAgICAgIHJvbGU6ICd3cml0ZXInLFxyXG4gICAgICAgICAgICB0eXBlOiAndXNlcicsXHJcbiAgICAgICAgICAgIGVtYWlsQWRkcmVzczogZW1haWwudHJpbSgpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gY2F0Y2ggKHVzZXJQZXJtRXJyKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKCdDb3VsZCBub3Qgc2hhcmUgZWRpdCBwZXJtaXNzaW9uIGRpcmVjdGx5IHdpdGggdXNlciBlbWFpbDonLCB1c2VyUGVybUVyci5tZXNzYWdlKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIDQuIEdyYW50IEVkaXRvciBwZXJtaXNzaW9uIHRvIG11bkBybnNpdC5hYy5pbiBzbyBvcmdhbml6aW5nIGNvbW1pdHRlZSByZXRhaW5zIGFjY2Vzc1xyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgZHJpdmUucGVybWlzc2lvbnMuY3JlYXRlKHtcclxuICAgICAgICBmaWxlSWQ6IHNwcmVhZHNoZWV0SWQsXHJcbiAgICAgICAgcmVxdWVzdEJvZHk6IHtcclxuICAgICAgICAgIHJvbGU6ICd3cml0ZXInLFxyXG4gICAgICAgICAgdHlwZTogJ3VzZXInLFxyXG4gICAgICAgICAgZW1haWxBZGRyZXNzOiAnbXVuQHJuc2l0LmFjLmluJ1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9IGNhdGNoIChtdW5FcnIpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdDb3VsZCBub3Qgc2hhcmUgd2l0aCBtdW5Acm5zaXQuYWMuaW46JywgbXVuRXJyLm1lc3NhZ2UpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIDUuIEdyYW50IFdyaXRlciBhY2Nlc3MgdG8gYW55b25lIHdpdGggbGluayAoZW5zdXJlcyBzZWFtbGVzcyBlZGl0IGFjY2VzcyBmb3IgYWxsIGRlbGVnYXRpb24gbWVtYmVycylcclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IGRyaXZlLnBlcm1pc3Npb25zLmNyZWF0ZSh7XHJcbiAgICAgICAgZmlsZUlkOiBzcHJlYWRzaGVldElkLFxyXG4gICAgICAgIHJlcXVlc3RCb2R5OiB7XHJcbiAgICAgICAgICByb2xlOiAnd3JpdGVyJyxcclxuICAgICAgICAgIHR5cGU6ICdhbnlvbmUnLFxyXG4gICAgICAgICAgYWxsb3dGaWxlRGlzY292ZXJ5OiBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9IGNhdGNoIChwZXJtRXJyb3IpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdDb3VsZCBub3Qgc2V0IGFueW9uZSBlZGl0IHBlcm1pc3Npb24gb24gc2hlZXQ6JywgcGVybUVycm9yLm1lc3NhZ2UpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXMuc3RhdHVzKDIwMCkuanNvbih7XHJcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgIHNoZWV0VXJsLFxyXG4gICAgICBzcHJlYWRzaGVldElkLFxyXG4gICAgICBoZWFkZXJzLFxyXG4gICAgICBoZWFkUm93XHJcbiAgICB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgY3JlYXRpbmcgR29vZ2xlIFNoZWV0OicsIGVycm9yKTtcclxuICAgIHJldHVybiByZXMuc3RhdHVzKDUwMCkuanNvbih7XHJcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIGNyZWF0ZSBHb29nbGUgU2hlZXQnXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFxUyxTQUFTLG9CQUFvQjtBQUNsVSxTQUFTLGVBQWU7QUFDeEIsU0FBUywwQkFBMEI7OztBQ0ZrUixTQUFTLGNBQWM7QUFFNVUsZUFBTyxRQUErQixLQUFLLEtBQUs7QUFFOUMsTUFBSSxVQUFVLG9DQUFvQyxJQUFJO0FBQ3RELE1BQUksVUFBVSwrQkFBK0IsR0FBRztBQUNoRCxNQUFJLFVBQVUsZ0NBQWdDLG1DQUFtQztBQUNqRixNQUFJO0FBQUEsSUFDRjtBQUFBLElBQ0E7QUFBQSxFQUNGO0FBRUEsTUFBSSxJQUFJLFdBQVcsV0FBVztBQUM1QixXQUFPLElBQUksT0FBTyxHQUFHLEVBQUUsSUFBSTtBQUFBLEVBQzdCO0FBRUEsTUFBSSxJQUFJLFdBQVcsUUFBUTtBQUN6QixXQUFPLElBQUksT0FBTyxHQUFHLEVBQUUsS0FBSyxFQUFFLFNBQVMsT0FBTyxPQUFPLDhDQUE4QyxDQUFDO0FBQUEsRUFDdEc7QUFFQSxNQUFJO0FBQ0YsVUFBTSxFQUFFLGdCQUFnQixnQkFBZ0IsVUFBVSxPQUFPLE1BQU0sSUFBSSxJQUFJLFFBQVEsQ0FBQztBQUVoRixRQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxLQUFLLEdBQUc7QUFDN0MsYUFBTyxJQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxTQUFTLE9BQU8sT0FBTywrQkFBK0IsQ0FBQztBQUFBLElBQ3ZGO0FBRUEsVUFBTSxjQUFjLGtCQUFrQixJQUFJLFlBQVksTUFBTTtBQUc1RCxVQUFNLFVBQVUsYUFDWjtBQUFBLE1BQ0U7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFB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
