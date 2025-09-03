"use client"

import React, { createContext, forwardRef, useCallback, useContext, useEffect, useState } from "react"
import { ChevronRight, File, Folder, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"

interface TreeContextProps {
  selectedId?: string
  expendedItems?: string[]
  indicator?: boolean
  handleExpand?: (id: string) => void
  handleSelect?: (id: string) => void
  dir?: "rtl" | "ltr"
}

const TreeContext = createContext<TreeContextProps | null>(null)

interface TreeViewElement {
  id: string
  name: string
  isSelectable?: boolean
  children?: TreeViewElement[]
}

interface TreeProps {
  data: TreeViewElement[] | TreeViewElement
  initialSelectedId?: string
  initialExpendedItems?: string[]
  elements?: TreeViewElement[]
  indicator?: boolean
  handleSelect?: (id: string) => void
  expandAll?: boolean
  defaultNodeIcon?: React.ReactNode
  defaultLeafIcon?: React.ReactNode
  className?: string
  dir?: "rtl" | "ltr"
}

const Tree = forwardRef<HTMLDivElement, TreeProps>(
  (
    {
      data,
      initialSelectedId,
      initialExpendedItems,
      className,
      indicator = true,
      handleSelect,
      expandAll,
      dir = "ltr",
    },
    ref,
  ) => {
    const [selectedId, setSelectedId] = useState<string | undefined>(initialSelectedId)
    const [expendedItems, setExpendedItems] = useState<string[]>(initialExpendedItems || [])

    const selectItem = useCallback(
      (id: string) => {
        setSelectedId(id)
        handleSelect?.(id)
      },
      [handleSelect],
    )

    const handleExpand = useCallback((id: string) => {
      setExpendedItems((prev) => {
        if (prev.includes(id)) {
          return prev.filter((item) => item !== id)
        }
        return [...prev, id]
      })
    }, [])

    const expandSpecificTargetedElements = useCallback(
      (elements?: TreeViewElement[], selectId?: string) => {
        if (!elements || !selectId) return
        const findParent = (
          currentElement: TreeViewElement,
          currentPath: string[] = [],
        ): string[] | null => {
          const isSelectable = currentElement.isSelectable ?? true
          const newPath = [...currentPath, currentElement.id]
          if (currentElement.id === selectId) {
            if (isSelectable) {
              setExpendedItems((prev) => [...prev, ...newPath])
            }
            return newPath
          }
          if (isSelectable && currentElement.children && currentElement.children.length > 0) {
            const result = currentElement.children
              .map((child) => findParent(child, newPath))
              .find((result) => result !== null)
            return result ?? null
          }
          return null
        }

        elements.forEach((element) => findParent(element))
      },
      [],
    )

    useEffect(() => {
      if (initialSelectedId) {
        expandSpecificTargetedElements(
          Array.isArray(data) ? data : [data],
          initialSelectedId,
        )
      }
    }, [initialSelectedId, data, expandSpecificTargetedElements])

    useEffect(() => {
      if (expandAll) {
        const expandTree = (element: TreeViewElement) => {
          const isSelectable = element.isSelectable ?? true
          if (isSelectable && element.children && element.children.length > 0) {
            setExpendedItems((prev) => [...prev, element.id])
            element.children.forEach(expandTree)
          }
        }

        const elements = Array.isArray(data) ? data : [data]
        elements.forEach(expandTree)
      }
    }, [data, expandAll])

    const direction = dir === "rtl" ? "rtl" : "ltr"

    return (
      <TreeContext.Provider
        value={{
          selectedId,
          expendedItems,
          handleExpand,
          handleSelect: selectItem,
          indicator,
          dir: direction,
        }}
      >
        <div className={cn("size-full", className)}>
          <TreeItem
            data={Array.isArray(data) ? data : [data]}
            ref={ref}
            dir={direction}
          />
        </div>
      </TreeContext.Provider>
    )
  },
)

Tree.displayName = "Tree"

const TreeItem = forwardRef<HTMLDivElement, { data: TreeViewElement[]; dir?: "rtl" | "ltr" }>(
  ({ data, dir }, ref) => {
    const { selectedId } = useContext(TreeContext)!

    return (
      <div ref={ref} role="tree" className="size-full">
        <ul className="size-full space-y-1">
          {data.map((item) => (
            <li key={item.id}>
              {item.children ? (
                <FolderComponent
                  element={item.name}
                  value={item.id}
                  isSelectable={item.isSelectable}
                  isSelect={selectedId === item.id}
                  dir={dir}
                >
                  <TreeItem data={item.children} dir={dir} />
                </FolderComponent>
              ) : (
                <FileComponent
                  value={item.id}
                  isSelectable={item.isSelectable}
                  isSelect={selectedId === item.id}
                  dir={dir}
                >
                  <span>{item.name}</span>
                </FileComponent>
              )}
            </li>
          ))}
        </ul>
      </div>
    )
  },
)

TreeItem.displayName = "TreeItem"

const FolderComponent = forwardRef<
  HTMLDivElement,
  {
    element?: string
    value?: string
    isSelectable?: boolean
    isSelect?: boolean
    children?: React.ReactNode
    dir?: "rtl" | "ltr"
  } & React.ComponentPropsWithoutRef<"div">
>(
  (
    { className, element, value, isSelectable = true, isSelect, children, dir, ...props },
    ref,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { selectedId, expendedItems, handleExpand, handleSelect, indicator } = useContext(TreeContext)!

    return (
      <div
        ref={ref}
        className={cn("relative", className)}
        {...props}
      >
        <div
          className={cn(
            "flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/50",
            isSelect && "bg-muted",
            !isSelectable && "cursor-not-allowed opacity-50",
          )}
          onClick={() => {
            if (isSelectable) {
              handleExpand?.(value!)
              handleSelect?.(value!)
            }
          }}
        >
          {indicator && (
            <ChevronRight
              className={cn(
                "size-4 shrink-0 transition-transform duration-200",
                expendedItems?.includes(value!) && "rotate-90",
                dir === "rtl" && "rotate-180",
              )}
            />
          )}
          {expendedItems?.includes(value!) ? (
            <FolderOpen className="size-4 shrink-0 text-accent-foreground" />
          ) : (
            <Folder className="size-4 shrink-0 text-accent-foreground" />
          )}
          <span className="flex-grow truncate">{element}</span>
        </div>
        {expendedItems?.includes(value!) && children && (
          <div className={cn("ml-5 mt-1", indicator && "border-l border-muted")}>
            {children}
          </div>
        )}
      </div>
    )
  },
)

FolderComponent.displayName = "Folder"

const FileComponent = forwardRef<
  HTMLDivElement,
  {
    value?: string
    isSelectable?: boolean
    isSelect?: boolean
    fileIcon?: React.ReactNode
    children?: React.ReactNode
    dir?: "rtl" | "ltr"
  } & React.ComponentPropsWithoutRef<"div">
>(
  (
    { className, value, isSelectable = true, isSelect, fileIcon, children, ...props },
    ref,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { selectedId, handleSelect, indicator } = useContext(TreeContext)!

    return (
      <div
        ref={ref}
        className={cn(
          "flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/50",
          isSelect && "bg-muted",
          !isSelectable && "cursor-not-allowed opacity-50",
          className,
        )}
        onClick={() => {
          if (isSelectable) {
            handleSelect?.(value!)
          }
        }}
        {...props}
      >
        {indicator && <div className="size-4 shrink-0" />}
        {fileIcon || <File className="size-4 shrink-0 text-accent-foreground" />}
        <span className="flex-grow truncate">{children}</span>
      </div>
    )
  },
)

FileComponent.displayName = "File"

export { Tree, type TreeViewElement } 