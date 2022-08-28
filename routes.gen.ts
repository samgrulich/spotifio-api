//AUTOMATICALLY GENERATED SCRIPT, regenerates everytime any RoutesGenerator is run 

import * as $0 from "./routes/home.tsx";
import * as $1 from "./routes/index.tsx";
import * as $2 from "./routes/auth/login.tsx";
import * as $3 from "./routes/auth/:user.tsx";

const manifest = { 
	routes: [
		{ urlPath: "/home", module: $0 }, 
		{ urlPath: "/", module: $1 }, 
		{ urlPath: "/auth/login", module: $2 }, 
		{ urlPath: "/auth/:user", module: $3 }, 
	], 
	baseUrl: import.meta.url,
} 

export default manifest;
