import { trpc } from "@/lib/trpc";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Group = {
  id: number;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdBy: number;
  createdAt: Date;
  role: "admin" | "member";
};

type GroupContextType = {
  groups: Group[];
  activeGroup: Group | null;
  setActiveGroupId: (id: number) => void;
  isGroupAdmin: boolean;
  isLoading: boolean;
  refetchGroups: () => void;
};

const GroupContext = createContext<GroupContextType>({
  groups: [],
  activeGroup: null,
  setActiveGroupId: () => {},
  isGroupAdmin: false,
  isLoading: true,
  refetchGroups: () => {},
});

const ACTIVE_GROUP_KEY = "bookclub-active-group";

export function GroupProvider({ children }: { children: ReactNode }) {
  const { data: groups, isLoading, refetch } = trpc.groups.myGroups.useQuery();
  const [activeGroupId, setActiveGroupId] = useState<number | null>(() => {
    const saved = localStorage.getItem(ACTIVE_GROUP_KEY);
    return saved ? parseInt(saved, 10) : null;
  });

  useEffect(() => {
    if (groups && groups.length > 0 && !groups.find((g) => g.id === activeGroupId)) {
      setActiveGroupId(groups[0].id);
    }
  }, [groups, activeGroupId]);

  useEffect(() => {
    if (activeGroupId !== null) {
      localStorage.setItem(ACTIVE_GROUP_KEY, activeGroupId.toString());
    }
  }, [activeGroupId]);

  const activeGroup = groups?.find((g) => g.id === activeGroupId) ?? null;

  return (
    <GroupContext.Provider
      value={{
        groups: groups ?? [],
        activeGroup,
        setActiveGroupId,
        isGroupAdmin: activeGroup?.role === "admin",
        isLoading,
        refetchGroups: refetch,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  return useContext(GroupContext);
}
