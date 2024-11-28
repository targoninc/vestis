import {create} from "./lib/fjsc/src/f2";

const content = document.getElementById('content');
content.appendChild(create("div").text("Hello World").build());

