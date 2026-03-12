# Architecture Patterns

## Overview

This guide documents the high-level architecture patterns used in **Quizzila** to ensure scalability (120+ players), reliability, and clean code separation.

## Patterns and Practices

### Pattern 1: Service Layer Pattern (Separation of Concerns)

**Description:**
Instead of mixing database client calls (Supabase) and business logic inside React components, move all infrastructure-related code into a dedicated "Services" layer.

**When to Use:**
- When multiple components need to interact with the same data source.
- To make components easier to test and cleaner to read.

**Implementation:**
Create a `src/services/` directory. For example, `src/services/game.ts`:
```typescript
import { supabase } from "@/lib/supabase";

export const GameService = {
  async getActiveSession() {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
  
  subscribeToSession(callback: (payload: any) => void) {
    return supabase
      .channel('live-quiz')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions' }, callback)
      .subscribe();
  }
};
```

### Pattern 2: Optimistic UI & Transition Management

**Description:**
For real-time interactions (like answering a quiz), the UI should reflect the user's action immediately ("Recording..."), even before the server confirms.

**When to Use:**
- Low-latency interactions in a live auditorium setting.

**Implementation:**
```typescript
const [isSyncing, setIsSyncing] = useState(false);

const handleAction = async (data) => {
  setIsSyncing(true); // Immediate UI feedback
  try {
    await service.update(data);
  } finally {
    setIsSyncing(false);
  }
};
```

## Guidelines

### Code Organization
- **Atomic Components**: Button, Input, Badges in `components/ui`.
- **Feature Components**: Complex blocks in `components/features`.
- **Services**: All API/Infrastructure logic in `services/`.
- **Hooks**: Shared stateful logic in `hooks/`.

### Performance Considerations
- **Subscription Management**: Ensure Every `supabase.subscribe()` has a corresponding `unsubscribe()` or `removeChannel()` in a `useEffect` cleanup.
- **Memoization**: Use `useMemo` for derived scores/leaderboard data to avoid redundant re-renders for every timer tick.

### Security Best Practices
- **Row Level Security (RLS)**: Ensure Supabase tables are protected by policies, even for anonymous players.
- **Input Sanitization**: Validate all inputs before sending to the database.

## Conclusion

Following these patterns ensures **Quizzila** remains maintainable as more features (like global leaderboards and team modes) are added.
