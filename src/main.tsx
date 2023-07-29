import { render } from "preact";
import { App } from "./app.tsx";
import "virtual:uno.css";
import "@unocss/reset/tailwind.css";
import "./globals.css";
render(<App />, document.getElementById("app")!);
