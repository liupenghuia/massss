import { go } from "../lib/nav";
import { SiteHeader } from "./SiteHeader";
import { Button } from "./ui/Button";

export function NotFound() {
  return (
    <div className="shell">
      <main className="public-phone">
        <SiteHeader />
        <div className="empty-card" style={{ marginTop: 28 }}>
          <div className="empty-blob" />
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>该车辆不存在或已下架</div>
          <p className="page-sub">可能已被下架或删除</p>
          <Button variant="primary" type="button" onClick={() => go("/")}>
            返回列表
          </Button>
        </div>
      </main>
    </div>
  );
}
