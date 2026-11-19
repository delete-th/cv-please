// The page reads Thea's CV content from a JSON block in the document (the single-file artifact carries it
// that way). For the website build it comes from data.json and is placed in the same block before the page starts.
import data from "./data.json";

const block = document.createElement("script");
block.type = "application/json";
block.id = "cv-data";
block.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
document.body.appendChild(block);
