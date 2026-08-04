import { defineComponent, h } from "vue";
import { cn } from "../lib/utils";

function styledTag(tag: string, base: string) {
  return defineComponent({
    props: { class: { type: String, default: "" } },
    setup(props, { slots }) {
      return () => h(tag, { class: cn(base, props.class) }, slots.default?.());
    },
  });
}

export const TableHeader = styledTag("thead", "[&_tr]:border-b");
export const TableBody = styledTag("tbody", "[&_tr:last-child]:border-0");
export const TableRow = styledTag(
  "tr",
  "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
);
export const TableHead = styledTag(
  "th",
  "h-11 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap",
);
export const TableCell = styledTag("td", "p-4 align-middle");
