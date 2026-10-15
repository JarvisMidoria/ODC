import contact from "../api/contact.js";

export function devContactPlugin() {
  return {
    name: "odc-contact-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/api/contact") return next();
        res.status = (status) => { res.statusCode = status; return res; };
        res.json = (body) => {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(body));
          return res;
        };
        Promise.resolve(contact(req, res)).catch(next);
      });
    }
  };
}
