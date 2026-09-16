import React from "react";
import { siStripe, siWhatsapp, type SimpleIcon } from "simple-icons";
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
  MoreVerticalIcon as MoreVerticalSvg,
  Notification01Icon as Notification01Svg,
  PencilEdit01Icon as PencilEdit01Svg,
  PlusSignIcon as PlusSignSvg,
  SafeIcon as SafeSvg,
  Search01Icon as Search01Svg,
  Setting06Icon as Setting06Svg,
  Sun01Icon as Sun01Svg,
  Timer01Icon as Timer01Svg,
  User02Icon as User02Svg,
  UserIcon as UserSvg,
  Wallet01Icon as Wallet01Svg,
  Tick01Icon as TickSvg,
  LockPasswordIcon as LockPasswordSvg,
  Logout02Icon as Logout02Svg,
  SortingIcon as SortingSvg,
  SortingUpIcon as SortingUpSvg,
  SortingDownIcon as SortingDownSvg,
  ColumnsThreeCogIcon as ColumnsThreeCogSvg,
  RepeatIcon as RepeatSvg,
  Globe02Icon as Globe02Svg,
  ArrowUpRight01Icon as ArrowUpRight01Svg,
  ArrowDownLeft01Icon as ArrowDownLeft01Svg,
  Attachment01Icon as Attachment01Svg,
  Tag01Icon as Tag01Svg,
  Upload01Icon as Upload01Svg,
  File01Icon as File01Svg,
  Image01Icon as Image01Svg,
  Pdf01Icon as Pdf01Svg,
  ListViewIcon as ListViewSvg,
  FolderFileStorageIcon as FolderFileSvg,
  FolderAddIcon as FolderAddSvg,
  SparklesIcon as SparklesSvg,
  Alert02Icon as Alert02Svg,
  Doc01Icon as Doc01Svg,
  FileSpreadsheetIcon as FileSpreadsheetSvg,
  Ppt01Icon as Ppt01Svg,
  Csv01Icon as Csv01Svg,
  Mail01Icon as Mail01Svg,
  Link01Icon as Link01Svg,
  DashboardSquare01Icon as DashboardSquare01Svg,
  ChartLineData01Icon as ChartLineData01Svg,
  MoneyExchange01Icon as MoneyExchange01Svg,
  MoneyBag02Icon as MoneyBag02Svg,
  UserStar01Icon as UserStar01Svg,
  ArrowDownRight01Icon as ArrowDownRight01Svg,
  QuoteUpIcon as QuoteUpSvg,
  PieChart01Icon as PieChart01Svg,
  UserRemove01Icon as UserRemove01Svg,
  TaxesIcon as TaxesSvg,
  ProfitIcon as ProfitSvg,
  ReceiptTextIcon as ReceiptTextSvg,
  Target01Icon as Target01Svg,
  CheckmarkCircle02Icon as CheckmarkCircle02Svg,
  CancelCircleIcon as CancelCircleSvg,
  Link04Icon as Link04Svg,
  Unlink02Icon as Unlink02Svg,
  ReloadIcon as ReloadSvg,
  MailBlock01Icon as MailBlock01Svg,
  DragDropIcon as DragDropSvg,
  ChevronLeft as ChevronLeftSvg,
  ChevronRight as ChevronRightSvg,
  ShareIcon as ShareSvg,
  NewTwitterIcon as NewTwitterSvg,
  MicrosoftIcon as MicrosoftSvg,
  BankIcon as BankSvg,
  AiChat01Icon as AiChat01Svg,
  Menu01Icon as Menu01Svg,
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
export const MoreVerticalIcon = make(MoreVerticalSvg);
export const Notification01Icon = make(Notification01Svg);
export const PencilEdit01Icon = make(PencilEdit01Svg);
export const PlusSignIcon = make(PlusSignSvg);
export const SafeIcon = make(SafeSvg);
export const Search01Icon = make(Search01Svg);
export const Setting06Icon = make(Setting06Svg);
export const Sun01Icon = make(Sun01Svg);
export const Timer01Icon = make(Timer01Svg);
export const User02Icon = make(User02Svg);
export const UserIcon = make(UserSvg);
export const Wallet01Icon = make(Wallet01Svg);
export const TickIcon = make(TickSvg);
export const LockPasswordIcon = make(LockPasswordSvg);
export const Logout02Icon = make(Logout02Svg);
export const SortingIcon = make(SortingSvg);
export const SortingUpIcon = make(SortingUpSvg);
export const SortingDownIcon = make(SortingDownSvg);
export const ColumnsThreeCogIcon = make(ColumnsThreeCogSvg);
export const RepeatIcon = make(RepeatSvg);
export const Globe02Icon = make(Globe02Svg);
export const ArrowUpRight01Icon = make(ArrowUpRight01Svg);
export const ArrowDownLeft01Icon = make(ArrowDownLeft01Svg);
export const Attachment01Icon = make(Attachment01Svg);
export const Tag01Icon = make(Tag01Svg);
export const Upload01Icon = make(Upload01Svg);
export const File01Icon = make(File01Svg);
export const Image01Icon = make(Image01Svg);
export const Pdf01Icon = make(Pdf01Svg);
export const ListViewIcon = make(ListViewSvg);
export const VaultIcon = make(FolderFileSvg);
export const FolderAddIcon = make(FolderAddSvg);
export const SparklesIcon = make(SparklesSvg);
export const Alert02Icon = make(Alert02Svg);
export const Doc01Icon = make(Doc01Svg);
export const FileSpreadsheetIcon = make(FileSpreadsheetSvg);
export const Ppt01Icon = make(Ppt01Svg);
export const Csv01Icon = make(Csv01Svg);
export const Mail01Icon = make(Mail01Svg);
export const Link01Icon = make(Link01Svg);
export const DashboardSquare01Icon = make(DashboardSquare01Svg);
export const ChartLineData01Icon = make(ChartLineData01Svg);
export const MoneyExchange01Icon = make(MoneyExchange01Svg);
export const MoneyBag02Icon = make(MoneyBag02Svg);
export const UserStar01Icon = make(UserStar01Svg);
export const ArrowDownRight01Icon = make(ArrowDownRight01Svg);
export const QuoteIcon = make(QuoteUpSvg);
export const PieChartIcon = make(PieChart01Svg);
export const UserRemoveIcon = make(UserRemove01Svg);
export const TaxesIcon = make(TaxesSvg);
export const ProfitIcon = make(ProfitSvg);
export const ReceiptTextIcon = make(ReceiptTextSvg);
export const TargetIcon = make(Target01Svg);
export const CheckmarkCircle02Icon = make(CheckmarkCircle02Svg);
export const CancelCircleIcon = make(CancelCircleSvg);
export const Link04Icon = make(Link04Svg);
export const Unlink02Icon = make(Unlink02Svg);
export const ReloadIcon = make(ReloadSvg);
export const MailBlock01Icon = make(MailBlock01Svg);
export const DragDropIcon = make(DragDropSvg);
export const ChevronLeftIcon = make(ChevronLeftSvg);
export const ChevronRightIcon = make(ChevronRightSvg);
export const ShareIcon = make(ShareSvg);
export const XIcon = make(NewTwitterSvg);
export const MicrosoftIcon = make(MicrosoftSvg);
export const BankIcon = make(BankSvg);
export const AiChat01Icon = make(AiChat01Svg);
export const Menu01Icon = make(Menu01Svg);

// Brand logos (Gmail, Outlook) are fixed multi-color marks, not currentColor
// glyphs, so they're hand-authored SVGs rather than wrapped Hugeicons.
export const GmailIcon: Icon = ({ size = 24, ...props }: IconProps) =>
  React.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 48 48", ...props },
    React.createElement("path", { fill: "#4caf50", d: "m45 16.2-5 2.75-5 4.75V40h7a3 3 0 0 0 3-3V16.2z" }),
    React.createElement("path", { fill: "#1e88e5", d: "m3 16.2 3.614 1.71L13 23.7V40H6a3 3 0 0 1-3-3V16.2z" }),
    React.createElement("path", {
      fill: "#e53935",
      d: "m35 11.2-11 8.25-11-8.25-1 5.8 1 6.7 11 8.25 11-8.25 1-6.7z",
    }),
    React.createElement("path", {
      fill: "#c62828",
      d: "M3 12.298V16.2l10 7.5V11.2L9.876 8.859A4.298 4.298 0 0 0 3 12.298z",
    }),
    React.createElement("path", {
      fill: "#fbc02d",
      d: "M45 12.298V16.2l-10 7.5V11.2l3.124-2.341A4.298 4.298 0 0 1 45 12.298z",
    }),
  )

// Single-color brand marks from the `simple-icons` registry (WhatsApp, Stripe)
// — same `fromSimpleIcon` approach as apps/app/src/components/pitch/brand-icons.tsx,
// ported here so app-facing settings UI doesn't import from the marketing-page-scoped file.
function fromSimpleIcon(icon: SimpleIcon): Icon {
  return ({ size = 24, ...props }: IconProps) =>
    React.createElement(
      "svg",
      {
        role: "img",
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        width: size,
        height: size,
        fill: `#${icon.hex}`,
        ...props,
      },
      React.createElement("path", { d: icon.path }),
    )
}

export const WhatsappIcon: Icon = fromSimpleIcon(siWhatsapp)
export const StripeIcon: Icon = fromSimpleIcon(siStripe)

export const OutlookIcon: Icon = ({ size = 24, ...props }: IconProps) =>
  React.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 48 48", ...props },
    React.createElement("path", {
      fill: "#40c4ff",
      d: "M31.323,8.502L7.075,23.872l-2.085-3.29v-2.835c0-1.032,0.523-1.994,1.389-2.556l14.095-9.146c2.147-1.393,4.914-1.394,7.061-0.001L31.323,8.502z",
    }),
    React.createElement("path", {
      fill: "#1976d2",
      d: "M27.317,5.911c0.073,0.043,0.145,0.088,0.217,0.135l11,7.136L11.259,30.47l-4.185-6.603l20.017-12.713C28.988,9.95,29.071,7.241,27.317,5.911z",
    }),
    React.createElement("path", {
      fill: "#0d47a1",
      d: "M22.142,33.771L11.26,30.47l23.136-14.666c1.949-1.235,1.944-4.08-0.009-5.308l-0.104-0.065l0.3,0.186l7.041,4.568c0.866,0.562,1.389,1.524,1.389,2.556v2.744L22.142,33.771z",
    }),
    React.createElement("path", {
      fill: "#29b6f6",
      d: "M20.886,43h15.523c3.646,0,6.602-2.956,6.602-6.602V17.797c0,1.077-0.554,2.079-1.466,2.652l-23.09,14.498c-1.246,0.782-2.001,2.15-2.001,3.62C16.454,41.016,18.438,43,20.886,43z",
    }),
    React.createElement("path", {
      fill: "#80d8ff",
      d: "M27.198,42.999H11.589c-3.646,0-6.602-2.956-6.602-6.602V17.783c0,1.076,0.552,2.076,1.461,2.649l23.067,14.543c1.263,0.796,2.029,2.185,2.029,3.678C31.544,41.053,29.598,42.999,27.198,42.999z",
    }),
    React.createElement("path", {
      fill: "#1565c0",
      d: "M6.453,23h10.094C18.454,23,20,24.546,20,26.453v10.094C20,38.454,18.454,40,16.547,40H6.453C4.546,40,3,38.454,3,36.547V26.453C3,24.546,4.546,23,6.453,23z",
    }),
    React.createElement("path", {
      fill: "#fff",
      d: "M11.453,36.518c-1.4,0-2.55-0.452-3.449-1.355c-0.899-0.903-1.348-2.082-1.348-3.537c0-1.536,0.456-2.778,1.369-3.726c0.913-0.949,2.107-1.423,3.584-1.423c1.396,0,2.532,0.454,3.408,1.362c0.881,0.908,1.321,2.105,1.321,3.591c0,1.527-0.456,2.758-1.369,3.692C14.061,36.053,12.889,36.518,11.453,36.518z M11.493,34.601c0.763,0,1.378-0.269,1.843-0.806c0.465-0.538,0.698-1.285,0.698-2.243c0-0.998-0.226-1.775-0.677-2.331c-0.452-0.556-1.055-0.833-1.809-0.833c-0.777,0-1.403,0.287-1.877,0.861c-0.474,0.569-0.711,1.323-0.711,2.263c0,0.953,0.237,1.707,0.711,2.263C10.145,34.326,10.752,34.601,11.493,34.601z",
    }),
  )
