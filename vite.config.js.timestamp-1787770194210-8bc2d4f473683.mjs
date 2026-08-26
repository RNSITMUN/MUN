// vite.config.js
import { defineConfig } from "file:///C:/Users/shriy/OneDrive/Documents/munsoc26%20new/MUN-Bhargs/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
import { ViteImageOptimizer } from "file:///C:/Users/shriy/OneDrive/Documents/munsoc26%20new/MUN-Bhargs/node_modules/vite-plugin-image-optimizer/dist/index.js";
var cleanUrlsPlugin = () => ({
  name: "clean-urls",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url.split("?")[0];
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxzaHJpeVxcXFxPbmVEcml2ZVxcXFxEb2N1bWVudHNcXFxcbXVuc29jMjYgbmV3XFxcXE1VTi1CaGFyZ3NcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHNocml5XFxcXE9uZURyaXZlXFxcXERvY3VtZW50c1xcXFxtdW5zb2MyNiBuZXdcXFxcTVVOLUJoYXJnc1xcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvc2hyaXkvT25lRHJpdmUvRG9jdW1lbnRzL211bnNvYzI2JTIwbmV3L01VTi1CaGFyZ3Mvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBWaXRlSW1hZ2VPcHRpbWl6ZXIgfSBmcm9tICd2aXRlLXBsdWdpbi1pbWFnZS1vcHRpbWl6ZXInO1xyXG5cclxuY29uc3QgY2xlYW5VcmxzUGx1Z2luID0gKCkgPT4gKHtcclxuICBuYW1lOiAnY2xlYW4tdXJscycsXHJcbiAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xyXG4gICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgY29uc3QgdXJsID0gcmVxLnVybC5zcGxpdCgnPycpWzBdO1xyXG4gICAgICBjb25zdCBoYXNFeHRlbnNpb24gPSAvXFwuW2EtekEtWjAtOV0rJC8udGVzdCh1cmwpO1xyXG4gICAgICBcclxuICAgICAgaWYgKCFoYXNFeHRlbnNpb24pIHtcclxuICAgICAgICBpZiAodXJsID09PSAnL3RlYW0nKSB7XHJcbiAgICAgICAgICByZXEudXJsID0gJy90ZWFtLmh0bWwnICsgcmVxLnVybC5zdWJzdHJpbmcoNSk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh1cmwgPT09ICcvc3RheS1jb25uZWN0ZWQnKSB7XHJcbiAgICAgICAgICByZXEudXJsID0gJy9zdGF5LWNvbm5lY3RlZC5odG1sJyArIHJlcS51cmwuc3Vic3RyaW5nKDE1KTtcclxuICAgICAgICB9IGVsc2UgaWYgKHVybCA9PT0gJy9wYXN0LWV2ZW50cycpIHtcclxuICAgICAgICAgIHJlcS51cmwgPSAnL3Bhc3QtZXZlbnRzLmh0bWwnICsgcmVxLnVybC5zdWJzdHJpbmcoMTIpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodXJsID09PSAnL3JlZ2lzdHJhdGlvbicpIHtcclxuICAgICAgICAgIHJlcS51cmwgPSAnL3JlZ2lzdHJhdGlvbi5odG1sJyArIHJlcS51cmwuc3Vic3RyaW5nKDEzKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHVybCA9PT0gJy9jaGFubmVscycpIHtcclxuICAgICAgICAgIHJlcS51cmwgPSAnL2NoYW5uZWxzLmh0bWwnICsgcmVxLnVybC5zdWJzdHJpbmcoOSk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh1cmwgPT09ICcvNDA0Jykge1xyXG4gICAgICAgICAgcmVxLnVybCA9ICcvNDA0Lmh0bWwnICsgcmVxLnVybC5zdWJzdHJpbmcoNCk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh1cmwgIT09ICcvJyAmJiB1cmwgIT09ICcnKSB7XHJcbiAgICAgICAgICAvLyBTZXJ2ZSBjdXN0b20gNDA0IHBhZ2UgZm9yIGFueSB1bm1hdGNoZWQgcGFnZSByb3V0ZXNcclxuICAgICAgICAgIHJlcS51cmwgPSAnLzQwNC5odG1sJztcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgbmV4dCgpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59KTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW1xyXG4gICAgY2xlYW5VcmxzUGx1Z2luKCksXHJcbiAgICBWaXRlSW1hZ2VPcHRpbWl6ZXIoe1xyXG4gICAgICBwbmc6IHtcclxuICAgICAgICBxdWFsaXR5OiA3NSxcclxuICAgICAgfSxcclxuICAgICAganBlZzoge1xyXG4gICAgICAgIHF1YWxpdHk6IDc1LFxyXG4gICAgICB9LFxyXG4gICAgICBqcGc6IHtcclxuICAgICAgICBxdWFsaXR5OiA3NSxcclxuICAgICAgfSxcclxuICAgICAgd2VicDoge1xyXG4gICAgICAgIHF1YWxpdHk6IDc1LFxyXG4gICAgICB9LFxyXG4gICAgICBzdmc6IGZhbHNlXHJcbiAgICB9KVxyXG4gIF0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICB3YXRjaDoge1xyXG4gICAgICBpZ25vcmVkOiBbXHJcbiAgICAgICAgJyoqLyouY3Jkb3dubG9hZCcsXHJcbiAgICAgICAgJyoqLyoudG1wJyxcclxuICAgICAgICAnKiovKi5wYXJ0JyxcclxuICAgICAgICAnKiovbm9kZV9tb2R1bGVzLyoqJyxcclxuICAgICAgICAnKiovc2hvZS1maW5kZXIvKionXHJcbiAgICAgIF1cclxuICAgIH1cclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIGlucHV0OiB7XHJcbiAgICAgICAgbWFpbjogcmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnaW5kZXguaHRtbCcpLFxyXG4gICAgICAgIGNvbm5lY3RlZDogcmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnc3RheS1jb25uZWN0ZWQuaHRtbCcpLFxyXG4gICAgICAgIHRlYW06IHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ3RlYW0uaHRtbCcpLFxyXG4gICAgICAgIHBhc3Q6IHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ3Bhc3QtZXZlbnRzLmh0bWwnKSxcclxuICAgICAgICByZWdpc3RyYXRpb246IHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ3JlZ2lzdHJhdGlvbi5odG1sJyksXHJcbiAgICAgICAgY2hhbm5lbHM6IHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ2NoYW5uZWxzLmh0bWwnKSxcclxuICAgICAgICBlcnJvcjogcmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnNDA0Lmh0bWwnKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE2VyxTQUFTLG9CQUFvQjtBQUMxWSxTQUFTLGVBQWU7QUFDeEIsU0FBUywwQkFBMEI7QUFFbkMsSUFBTSxrQkFBa0IsT0FBTztBQUFBLEVBQzdCLE1BQU07QUFBQSxFQUNOLGdCQUFnQixRQUFRO0FBQ3RCLFdBQU8sWUFBWSxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVM7QUFDekMsWUFBTSxNQUFNLElBQUksSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO0FBQ2hDLFlBQU0sZUFBZSxrQkFBa0IsS0FBSyxHQUFHO0FBRS9DLFVBQUksQ0FBQyxjQUFjO0FBQ2pCLFlBQUksUUFBUSxTQUFTO0FBQ25CLGNBQUksTUFBTSxlQUFlLElBQUksSUFBSSxVQUFVLENBQUM7QUFBQSxRQUM5QyxXQUFXLFFBQVEsbUJBQW1CO0FBQ3BDLGNBQUksTUFBTSx5QkFBeUIsSUFBSSxJQUFJLFVBQVUsRUFBRTtBQUFBLFFBQ3pELFdBQVcsUUFBUSxnQkFBZ0I7QUFDakMsY0FBSSxNQUFNLHNCQUFzQixJQUFJLElBQUksVUFBVSxFQUFFO0FBQUEsUUFDdEQsV0FBVyxRQUFRLGlCQUFpQjtBQUNsQyxjQUFJLE1BQU0sdUJBQXVCLElBQUksSUFBSSxVQUFVLEVBQUU7QUFBQSxRQUN2RCxXQUFXLFFBQVEsYUFBYTtBQUM5QixjQUFJLE1BQU0sbUJBQW1CLElBQUksSUFBSSxVQUFVLENBQUM7QUFBQSxRQUNsRCxXQUFXLFFBQVEsUUFBUTtBQUN6QixjQUFJLE1BQU0sY0FBYyxJQUFJLElBQUksVUFBVSxDQUFDO0FBQUEsUUFDN0MsV0FBVyxRQUFRLE9BQU8sUUFBUSxJQUFJO0FBRXBDLGNBQUksTUFBTTtBQUFBLFFBQ1o7QUFBQSxNQUNGO0FBQ0EsV0FBSztBQUFBLElBQ1AsQ0FBQztBQUFBLEVBQ0g7QUFDRjtBQUVBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLGdCQUFnQjtBQUFBLElBQ2hCLG1CQUFtQjtBQUFBLE1BQ2pCLEtBQUs7QUFBQSxRQUNILFNBQVM7QUFBQSxNQUNYO0FBQUEsTUFDQSxNQUFNO0FBQUEsUUFDSixTQUFTO0FBQUEsTUFDWDtBQUFBLE1BQ0EsS0FBSztBQUFBLFFBQ0gsU0FBUztBQUFBLE1BQ1g7QUFBQSxNQUNBLE1BQU07QUFBQSxRQUNKLFNBQVM7QUFBQSxNQUNYO0FBQUEsTUFDQSxLQUFLO0FBQUEsSUFDUCxDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsU0FBUztBQUFBLFFBQ1A7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxlQUFlO0FBQUEsTUFDYixPQUFPO0FBQUEsUUFDTCxNQUFNLFFBQVEsUUFBUSxJQUFJLEdBQUcsWUFBWTtBQUFBLFFBQ3pDLFdBQVcsUUFBUSxRQUFRLElBQUksR0FBRyxxQkFBcUI7QUFBQSxRQUN2RCxNQUFNLFFBQVEsUUFBUSxJQUFJLEdBQUcsV0FBVztBQUFBLFFBQ3hDLE1BQU0sUUFBUSxRQUFRLElBQUksR0FBRyxrQkFBa0I7QUFBQSxRQUMvQyxjQUFjLFFBQVEsUUFBUSxJQUFJLEdBQUcsbUJBQW1CO0FBQUEsUUFDeEQsVUFBVSxRQUFRLFFBQVEsSUFBSSxHQUFHLGVBQWU7QUFBQSxRQUNoRCxPQUFPLFFBQVEsUUFBUSxJQUFJLEdBQUcsVUFBVTtBQUFBLE1BQzFDO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
