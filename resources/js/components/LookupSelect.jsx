import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLookups } from "../hooks/useLookups";
import { createLookup } from "../services/scholarships";
import { useToast } from "../context/ToastContext";

/**
 * Combobox with inline "add new" capability.
 *
 * Props:
 *   type      — 'scheme' | 'donor' | 'academic_year'
 *   value     — current string value
 *   onChange  — (newValue: string) => void
 *   required  — boolean
 *   placeholder — string
 *   disabled  — boolean
 *   autoFocus — boolean
 */
export default function LookupSelect({
    type,
    value,
    onChange,
    required,
    placeholder,
    disabled,
    autoFocus,
}) {
    const toast = useToast();
    const qc = useQueryClient();
    const { items, isLoading } = useLookups(type);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlight, setHighlight] = useState(0);
    const [adding, setAdding] = useState(false);
    const [inputRect, setInputRect] = useState(null);

    const wrapRef = useRef(null);
    const inputRef = useRef(null);

    // Sync query with external value while closed
    useEffect(() => {
        if (!open) setQuery(value ?? "");
    }, [value, open]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target))
                setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Position dropdown below input
    useEffect(() => {
        if (open && inputRef.current) {
            setInputRect(inputRef.current.getBoundingClientRect());
        }
    }, [open]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((i) => i.name.toLowerCase().includes(q));
    }, [items, query]);

    const exactMatch = filtered.some(
        (i) => i.name.toLowerCase() === query.trim().toLowerCase(),
    );
    const trimmed = query.trim();
    const canAdd = trimmed.length > 0 && !exactMatch;
    const total = filtered.length + (canAdd ? 1 : 0);

    const pick = (name) => {
        onChange(name);
        setQuery(name);
        setOpen(false);
        inputRef.current?.blur();
    };

    const addNew = async () => {
        if (!trimmed || adding) return;
        setAdding(true);
        try {
            const created = await createLookup(type, trimmed);
            await qc.invalidateQueries({ queryKey: ["lookups", type] });
            pick(created.name);
            toast.success(`"${created.name}" added to ${labelFor(type)}`);
        } catch (err) {
            toast.error(
                err?.response?.data?.message ?? "Could not add. Try again.",
            );
        } finally {
            setAdding(false);
        }
    };

    const onKeyDown = (e) => {
        if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
            return;
        }
        if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
            setOpen(true);
            return;
        }
        if (!open) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, total - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlight < filtered.length) pick(filtered[highlight].name);
            else if (canAdd) addNew();
        } else if (e.key === "Tab") {
            setOpen(false);
        }
    };

    return (
        <div ref={wrapRef} className="relative">
            <input
                ref={inputRef}
                type="text"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:bg-slate-50 disabled:text-slate-500"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                    setHighlight(0);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                placeholder={
                    placeholder || `Select or type to add ${labelFor(type)}…`
                }
                required={required}
                disabled={disabled}
                autoFocus={autoFocus}
            />

            {open && !disabled && (
                <div
                    className="fixed bg-white border border-slate-200 rounded-lg shadow-xl max-h-72 overflow-auto z-[120]"
                    style={{
                        top: (inputRect?.bottom ?? 0) + 4,
                        left: inputRect?.left ?? 0,
                        width: inputRect?.width ?? 0,
                    }}
                >
                    {isLoading && (
                        <div className="px-3 py-2 text-xs text-slate-500">
                            Loading…
                        </div>
                    )}

                    {!isLoading && filtered.length === 0 && !canAdd && (
                        <div className="px-3 py-2 text-xs text-slate-500">
                            No matches.
                        </div>
                    )}

                    {filtered.map((item, i) => (
                        <div
                            key={item.id}
                            onMouseEnter={() => setHighlight(i)}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                pick(item.name);
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${
                                i === highlight
                                    ? "bg-emerald-50 text-emerald-900"
                                    : "hover:bg-slate-50"
                            }`}
                        >
                            <span>{item.name}</span>
                            {item.name === value && (
                                <span className="text-emerald-600 text-xs font-bold">
                                    ✓
                                </span>
                            )}
                        </div>
                    ))}

                    {canAdd && (
                        <div
                            onMouseEnter={() => setHighlight(filtered.length)}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                addNew();
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer border-t border-slate-100 flex items-center gap-2 font-semibold ${
                                highlight === filtered.length
                                    ? "bg-emerald-50 text-emerald-800"
                                    : "text-emerald-700 hover:bg-emerald-50"
                            }`}
                        >
                            <span className="text-lg leading-none">+</span>
                            <span>
                                {adding
                                    ? "Adding…"
                                    : `Add "${trimmed}" as new ${labelFor(type)}`}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function labelFor(type) {
    return (
        { scheme: "scheme", donor: "donor", academic_year: "academic year" }[
            type
        ] || type
    );
}
