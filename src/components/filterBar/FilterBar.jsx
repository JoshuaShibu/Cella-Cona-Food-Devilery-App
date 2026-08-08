import { useEffect, useState } from "react";
import {
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Button,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { dishFacetsService } from "../../services/dishes.services";

const SORT_OPTIONS = [
  { value: "name:asc", labelKey: "filters.sortNameAsc" },
  { value: "price:asc", labelKey: "filters.sortPriceAsc" },
  { value: "price:desc", labelKey: "filters.sortPriceDesc" },
  { value: "rating:desc", labelKey: "filters.sortRatingDesc" },
  { value: "order_count:desc", labelKey: "filters.sortPopular" },
];

const DIET_FILTERS = [
  { key: "is_vegetarian", labelKey: "filters.vegetarian" },
  { key: "is_vegan", labelKey: "filters.vegan" },
  { key: "is_gluten_free", labelKey: "filters.glutenFree" },
];

export default function FilterBar({ filters, onChange, resultCount }) {
  const { t } = useTranslation();
  const [facets, setFacets] = useState(null);

  useEffect(() => {
    dishFacetsService()
      .then(setFacets)
      .catch(() => setFacets(null));
  }, []);

  const set = (patch) => onChange({ ...filters, ...patch });

  const toggleDiet = (key) =>
    set({ [key]: filters[key] ? undefined : true });

  const sortValue = `${filters.sort_by ?? "name"}:${filters.order ?? "asc"}`;
  const handleSort = (value) => {
    const [sort_by, order] = value.split(":");
    set({ sort_by, order });
  };

  const priceMax = facets?.price_range?.max ?? 20;
  const priceMin = facets?.price_range?.min ?? 0;
  const priceValue = [
    filters.min_price ?? priceMin,
    filters.max_price ?? priceMax,
  ];

  const activeCount = [
    filters.category,
    filters.cuisine,
    filters.tag,
    filters.is_vegetarian,
    filters.is_vegan,
    filters.is_gluten_free,
    filters.max_spice,
    filters.min_price,
    filters.max_price,
  ].filter(Boolean).length;

  const clearAll = () =>
    onChange({ search: filters.search, sort_by: "name", order: "asc" });

  return (
    <div className="filter-bar">
      <div className="filter-bar-row">
        <FormControl size="small" className="filter-control">
          <InputLabel>{t("filters.category")}</InputLabel>
          <Select
            value={filters.category ?? ""}
            label={t("filters.category")}
            onChange={(e) => set({ category: e.target.value || undefined })}
          >
            <MenuItem value="">{t("filters.all")}</MenuItem>
            {(facets?.categories ?? []).map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" className="filter-control">
          <InputLabel>{t("filters.cuisine")}</InputLabel>
          <Select
            value={filters.cuisine ?? ""}
            label={t("filters.cuisine")}
            onChange={(e) => set({ cuisine: e.target.value || undefined })}
          >
            <MenuItem value="">{t("filters.all")}</MenuItem>
            {(facets?.cuisines ?? []).map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" className="filter-control">
          <InputLabel>{t("filters.sortBy")}</InputLabel>
          <Select
            value={sortValue}
            label={t("filters.sortBy")}
            onChange={(e) => handleSort(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {t(o.labelKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      <div className="filter-bar-row">
        <div className="filter-chips">
          {DIET_FILTERS.map((d) => (
            <Chip
              key={d.key}
              label={t(d.labelKey)}
              clickable
              color={filters[d.key] ? "primary" : "default"}
              variant={filters[d.key] ? "filled" : "outlined"}
              onClick={() => toggleDiet(d.key)}
            />
          ))}
          {(facets?.tags ?? []).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              clickable
              color={filters.tag === tag ? "primary" : "default"}
              variant={filters.tag === tag ? "filled" : "outlined"}
              onClick={() =>
                set({ tag: filters.tag === tag ? undefined : tag })
              }
            />
          ))}
        </div>
      </div>

      <div className="filter-bar-row filter-bar-row--sliders">
        <div className="filter-slider">
          <label>
            {t("filters.priceRange")}: €{priceValue[0]} – €{priceValue[1]}
          </label>
          <Slider
            size="small"
            value={priceValue}
            min={priceMin}
            max={priceMax}
            step={0.5}
            onChange={(_, v) => set({ min_price: v[0], max_price: v[1] })}
            valueLabelDisplay="auto"
          />
        </div>

        <div className="filter-slider">
          <label>
            {t("filters.maxSpice")}: {filters.max_spice ?? 5}
          </label>
          <Slider
            size="small"
            value={filters.max_spice ?? 5}
            min={1}
            max={5}
            step={1}
            marks
            onChange={(_, v) => set({ max_spice: v === 5 ? undefined : v })}
            valueLabelDisplay="auto"
          />
        </div>
      </div>

      <div className="filter-bar-footer">
        <span className="filter-count">
          {t("filters.showing", { count: resultCount })}
        </span>
        {activeCount > 0 && (
          <Button size="small" onClick={clearAll}>
            {t("filters.clearAll")} ({activeCount})
          </Button>
        )}
      </div>
    </div>
  );
}
