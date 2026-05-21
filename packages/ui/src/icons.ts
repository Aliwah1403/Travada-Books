import React from "react";
import {
  HugeiconsIcon,
  type HugeiconsIconProps,
  type IconSvgElement,
} from "@hugeicons/react";
import {
  Alert01Icon as Alert01Svg,
  ArrowLeft01Icon as ArrowLeft01Svg,
  ArrowRight01Icon as ArrowRight01Svg,
  ArrowDown01Icon as ArrowDown01Svg,
  Calendar01Icon as Calendar01Svg,
  ClockCheckIcon as ClockCheckSvg,
  EyeIcon as EyeSvg,
  EyeOff as EyeOffSvg,
  Sent02Icon as SendSvg,
  Settings02Icon as SettingsSvg,
  FloppyDiskIcon as FloppyDiskSvg,
  SendingOrderIcon as SendingOrderSvg,
  Cancel01Icon as Cancel01Svg,
  CheckmarkCircle01Icon as CheckmarkCircle01Svg,
  Clock01Icon as Clock01Svg,
  Copy01Icon as Copy01Svg,
  Delete01Icon as Delete01Svg,
  Download01Icon as Download01Svg,
  FileEditIcon as FileEditSvg,
  FilterIcon as FilterSvg,
  GridIcon as GridSvg,
  InboxIcon as InboxSvg,
  Invoice01Icon as Invoice01Svg,
  Moon01Icon as Moon01Svg,
  MoreHorizontalIcon as MoreHorizontalSvg,
  Notification01Icon as Notification01Svg,
  PencilEdit01Icon as PencilEdit01Svg,
  PlusSignIcon as PlusSignSvg,
  SafeIcon as SafeSvg,
  Search01Icon as Search01Svg,
  Setting06Icon as Setting06Svg,
  Sun01Icon as Sun01Svg,
  Timer01Icon as Timer01Svg,
  User02Icon as User02Svg,
  Wallet01Icon as Wallet01Svg,
} from "@hugeicons/core-free-icons";

export type IconProps = Omit<HugeiconsIconProps, "icon">;
export type Icon = React.ComponentType<IconProps>;

function make(svg: IconSvgElement): Icon {
  return (props: IconProps) =>
    React.createElement(HugeiconsIcon, {
      icon: svg,
      color: "currentColor",
      strokeWidth: 1.5,
      ...props,
    });
}

export const Alert01Icon = make(Alert01Svg);
export const ArrowDown01Icon = make(ArrowDown01Svg);
export const ArrowLeft01Icon = make(ArrowLeft01Svg);
export const ArrowRight01Icon = make(ArrowRight01Svg);
export const Calendar01Icon = make(Calendar01Svg);
export const ClockCheckIcon = make(ClockCheckSvg);
export const Sent02Icon = make(SendSvg);
export const Settings02Icon = make(SettingsSvg);
export const EyeIcon = make(EyeSvg);
export const EyeOffIcon = make(EyeOffSvg);
export const FloppyDiskIcon = make(FloppyDiskSvg);
export const SendingOrderIcon = make(SendingOrderSvg);
export const Cancel01Icon = make(Cancel01Svg);
export const CheckmarkCircle01Icon = make(CheckmarkCircle01Svg);
export const Clock01Icon = make(Clock01Svg);
export const Copy01Icon = make(Copy01Svg);
export const Delete01Icon = make(Delete01Svg);
export const Download01Icon = make(Download01Svg);
export const FileEditIcon = make(FileEditSvg);
export const FilterIcon = make(FilterSvg);
export const GridIcon = make(GridSvg);
export const InboxIcon = make(InboxSvg);
export const Invoice01Icon = make(Invoice01Svg);
export const Moon01Icon = make(Moon01Svg);
export const MoreHorizontalIcon = make(MoreHorizontalSvg);
export const Notification01Icon = make(Notification01Svg);
export const PencilEdit01Icon = make(PencilEdit01Svg);
export const PlusSignIcon = make(PlusSignSvg);
export const SafeIcon = make(SafeSvg);
export const Search01Icon = make(Search01Svg);
export const Setting06Icon = make(Setting06Svg);
export const Sun01Icon = make(Sun01Svg);
export const Timer01Icon = make(Timer01Svg);
export const User02Icon = make(User02Svg);
export const Wallet01Icon = make(Wallet01Svg);
