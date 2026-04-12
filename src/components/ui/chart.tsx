"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

export type ChartConfig = Record<
  string,
  {
    label?: string
    color?: string
  }
>

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

type ChartContainerProps = React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId()
    const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

    const styleVars = Object.entries(config).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value.color) acc[`--color-${key}`] = value.color
      return acc
    }, {})

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          ref={ref}
          data-chart={chartId}
          className={cn("flex h-[180px] w-full text-xs", className)}
          style={styleVars as React.CSSProperties}
          {...props}
        >
          <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    )
  }
)
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = RechartsPrimitive.Tooltip

type ChartTooltipContentProps = React.ComponentProps<"div"> & {
  active?: boolean
  payload?: Array<{
    color?: string
    dataKey?: string
    value?: number | string
    name?: string
  }>
  label?: string | number
}

function ChartTooltipContent({ active, payload, label, className }: ChartTooltipContentProps) {
  const { config } = useChart()

  if (!active || !payload?.length) return null

  return (
    <div
      className={cn(
        "grid min-w-[140px] gap-1 rounded-lg border border-slate-300 bg-white/95 px-2.5 py-2 text-xs shadow-md dark:border-[#3a3a3a] dark:bg-[#262626]/95",
        className
      )}
    >
      {label !== undefined && <p className="text-[10px] text-slate-500 dark:text-zinc-400">{label}</p>}
      {payload.map((item, index) => {
        const key = String(item.dataKey ?? item.name ?? index)
        const itemConfig = config[key]
        const itemLabel = itemConfig?.label ?? key
        const itemColor = item.color ?? itemConfig?.color ?? "currentColor"

        return (
          <div key={key} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: itemColor }} />
              <span className="text-slate-600 dark:text-zinc-300">{itemLabel}</span>
            </div>
            <span className="font-semibold text-slate-900 dark:text-zinc-100">{item.value}</span>
          </div>
        )
      })}
    </div>
  )
}

export { ChartContainer, ChartTooltip, ChartTooltipContent }

