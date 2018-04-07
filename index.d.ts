import * as React from "react";
import {ViewStyle} from "react-native";

declare module "react-native-lightbox" {

  interface ILightboxProps {
    style?: ViewStyle;
    navigatior?: any;
    renderHeader?: () => JSX.Element;
    renderContent?: () => JSX.Element;
    backgroundColor?: string;
    didOpen?: () => void;
    onOpen?: () => void;
    willClose?: () => void;
    onClose?: () => void;
    springConfig?: {tension: number, friction: number};
    swipeToDismiss?: boolean;
  }

  export class Lightbox extends React.PureComponent<ILightboxProps> { }
}
