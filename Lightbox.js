import React, {PureComponent,  Children, cloneElement} from 'react';
import PropTypes from 'prop-types';
import {TouchableOpacity, View} from 'react-native';
import {LightboxOverlay} from './LightboxOverlay';

export class Lightbox extends PureComponent {
  root: View;
  setRootRef = (ref: any): void => this.root = ref;
  onRootLayout = (): void => {};

  static propTypes = {
    activeProps:     PropTypes.object,
    renderHeader:    PropTypes.func,
    renderContent:   PropTypes.func,
    backgroundColor: PropTypes.string,
    didOpen:         PropTypes.func,
    onOpen:          PropTypes.func,
    willClose:       PropTypes.func,
    onClose:         PropTypes.func,
    springConfig:    PropTypes.shape({
      tension:       PropTypes.number,
      friction:      PropTypes.number,
    }),
    swipeToDismiss:  PropTypes.bool,
  };

  static defaultProps = {
    swipeToDismiss: true,
    onOpen: () => {},
    didOpen: () => {},
    willClose: () => {},
    onClose: () => {},
  };

  state = {
    isOpen: false,
    origin: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    },
  };

  getContent = () => {
    if(this.props.renderContent) {
      return this.props.renderContent();
    } else if(this.props.activeProps) {
      return cloneElement(
        Children.only(this.props.children),
        this.props.activeProps
      );
    }
    return this.props.children;
  }

  getOverlayProps = () => ({
    isOpen: this.state.isOpen,
    origin: this.state.origin,
    renderHeader: this.props.renderHeader,
    swipeToDismiss: this.props.swipeToDismiss,
    springConfig: this.props.springConfig,
    backgroundColor: this.props.backgroundColor,
    children: this.getContent(),
    didOpen: this.props.didOpen,
    willClose: this.props.willClose,
    onClose: this.onClose,
  })

  open = () => {
    this.root.measure((ox, oy, width, height, px, py) => {
      this.props.onOpen();

      this.setState({
        isOpen: this.props.navigator != null,
        isAnimating: true,
        origin: {
          width,
          height,
          x: px,
          y: py,
        },
      }, () => {
        this.props.didOpen()
        if(this.props.navigator) {
          const route = {
            component: LightboxOverlay,
            passProps: this.getOverlayProps(),
          };
          const routes = this.props.navigator.getCurrentRoutes();
          routes.push(route);
          this.props.navigator.immediatelyResetRouteStack(routes);
        } else {
          this.setState({isOpen: true});
        }
      });
    });
  }

  onClose = () => {
    this.setState({
      isOpen: false,
    }, this.props.onClose);
    if(this.props.navigator != null) {
      const routes = this.props.navigator.getCurrentRoutes();
      routes.pop();
      this.props.navigator.immediatelyResetRouteStack(routes);
    }
  }

  render() {
    const {style, children, navigator} = this.props;
    // measure will not return anything useful if we dont attach a onLayout handler on android
    return (
      <View ref={this.setRootRef} style={style} onLayout={this.onRootLayout}>
          <TouchableOpacity onPress={this.open} activeOpacity={1}>
            {children}
          </TouchableOpacity>
        {navigator != null ? null : <LightboxOverlay {...this.getOverlayProps()}/>}
      </View>
    );
  }
}
