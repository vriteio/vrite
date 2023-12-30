import module from "./index.js";

const extension = module.default;

console.log(extension.generateSpec());
console.log(JSON.stringify(extension.generateView("0"), null, 2));
console.log(extension.env);
