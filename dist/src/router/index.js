"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vue_router_1 = require("vue-router");
const BusTimetable_vue_1 = __importDefault(require("@/views/BusTimetable.vue"));
const router = (0, vue_router_1.createRouter)({
    history: (0, vue_router_1.createWebHashHistory)(),
    routes: [
        { path: '/', component: BusTimetable_vue_1.default },
    ]
});
exports.default = router;
//# sourceMappingURL=index.js.map