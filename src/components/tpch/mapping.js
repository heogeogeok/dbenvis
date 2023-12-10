import * as d3 from "d3";

export const PostgresToMySQL = {
  Limit: "Limit",
  Aggregate: "Group",
  Gather: "Gather",
  "Gather Merge": "Gather Merge",
  Sort: "Order",
  "Seq Scan": "Full Table Scan",
  "Index Scan": "Key Lookup",
  "Index Only Scan": "Key Lookup",
  "Bitmap Heap Scan": "Key Lookup",
  "Bitmap Index Scan": "Key Lookup",
  "Nested Loop": "Nested Loop",
  "Hash Join": "Hash Join",
  "Merge Join": "Hash Join",
  Hash: "Hash",
};

export const MySqlToPostgres = {
  Limit: "Limit",
  Group: "Aggregate",
  Order: "Sort",
  "Full Table Scan": "Seq Scan",
  "Unique Key Lookup": "Index Scan",
  "Non-Unique Key Lookup": "Index Scan",
  "Nested Loop": "Nested Loop",
  "Hash Join": "Hash Join",
  "Attached Subquery": "Attached Subquery",
  Materialize: "Materialize",
};

export const mapOpLegend = {
  Aggregate: "Group",
  Group: "Group",
  Sort: "Sort",
  Order: "Sort",
  "Seq Scan": "Full Scan",
  "Full Table Scan": "Full Scan",
  "Index Scan": "Scan",
  "Index Only Scan": "Scan",
  "Full Index Scan": "Scan",
  "Unique Key Lookup": "Scan",
  "Non-Unique Key Lookup": "Scan",
  "Bitmap Heap Scan": "Scan",
  "Bitmap Index Scan": "Scan",
  "Nested Loop": "Join",
  Join: "Join",
  "Hash Join": "Join",
  "Merge Join": "Join",
  Materialize: "Materialize",
  Hash: "Gather",
  Gather: "Gather",
  "Gather Merge": "Gather",
};

export const nodeColor = d3
  .scaleOrdinal()
  .domain([
    "Aggregate",
    "Group",
    "Sort",
    "Order",
    "Seq Scan",
    "Full Table Scan",
    "Index Scan",
    "Index Only Scan",
    "Full Index Scan",
    "Unique Key Lookup",
    "Non-Unique Key Lookup",
    "Bitmap Heap Scan",
    "Bitmap Index Scan",
    "Nested Loop",
    "Join",
    "Hash Join",
    "Merge Join",
    "Materialize",
    "Limit",
    "Attached Subquery",
    "Hash",
    "Gather",
    "Gather Merge",
  ])
  .range([
    "#fbb4ae",
    "#fbb4ae",
    "#b3cde3",
    "#b3cde3",
    "#ccebc5",
    "#ccebc5",
    "#decbe4",
    "#decbe4",
    "#decbe4",
    "#decbe4",
    "#decbe4",
    "#decbe4",
    "#decbe4",
    "#fed9a6",
    "#fed9a6",
    "#fed9a6",
    "#fed9a6",
    "#ffffcc",
    "#f2f2f2",
    "#f2f2f2",
    "#f2f2f2",
    "#f2f2f2",
    "#f2f2f2",
  ]);

export const legendOpColor = d3
  .scaleOrdinal()
  .domain([
    "Group",
    "Sort",
    "Full Scan",
    "Scan",
    "Join",
    "Materialize",
    "Gather",
  ])
  .range([
    "#fbb4ae",
    "#b3cde3",
    "#ccebc5",
    "#decbe4",
    "#fed9a6",
    "#ffffcc",
    "#f2f2f2",
  ]);

export function shadeColor(color, percent) {
  var r = parseInt(color.substring(1, 3), 16);
  var g = parseInt(color.substring(3, 5), 16);
  var b = parseInt(color.substring(5, 7), 16);

  r = parseInt((r * (100 + percent)) / 100);
  g = parseInt((g * (100 + percent)) / 100);
  b = parseInt((b * (100 + percent)) / 100);

  r = r < 255 ? r : 255;
  g = g < 255 ? g : 255;
  b = b < 255 ? b : 255;

  var rr = r.toString(16).length === 1 ? "0" + r.toString(16) : r.toString(16);
  var gg = g.toString(16).length === 1 ? "0" + g.toString(16) : g.toString(16);
  var bb = b.toString(16).length === 1 ? "0" + b.toString(16) : b.toString(16);

  return "#" + rr + gg + bb;
}
