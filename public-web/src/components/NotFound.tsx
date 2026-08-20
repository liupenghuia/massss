import { go } from "../lib/nav";
import { Button } from "./ui/Button";

export function NotFound() {
  return (
    <div className="shell">
      <main className="public-phone">
        <div className="empty-card">
          <div className="empty-blob" />
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>找不到该车辆</div>
          <Button variant="primary" type="button" onClick={() => go("/")}>
            返回列表
          </Button>
        </div>
      </main>
    </div>
  );
}
