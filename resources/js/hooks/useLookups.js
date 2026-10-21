import { useQuery } from "@tanstack/react-query";
import { fetchLookups } from "../services/scholarships";

export function useLookups(type) {
    const { data = [], isLoading } = useQuery({
        queryKey: ["lookups", type],
        queryFn: () => fetchLookups(type),
        staleTime: 60_000,
    });
    return { items: data, isLoading };
}
