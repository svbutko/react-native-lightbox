import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Animated, Dimensions, Modal, PanResponder, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const WINDOW_HEIGHT = Dimensions.get('window').height;
const WINDOW_WIDTH = Dimensions.get('window').width;
const DRAG_DISMISS_THRESHOLD = 150;
const isIOS = Platform.OS == 'ios';
const STATUS_BAR_OFFSET = (isIOS ? 0 : -25);

export class LightboxOverlay extends PureComponent {
  static propTypes = {
    origin: PropTypes.shape({
      x:        PropTypes.number,
      y:        PropTypes.number,
      width:    PropTypes.number,
      height:   PropTypes.number,
    }),
    springConfig: PropTypes.shape({
      tension:  PropTypes.number,
      friction: PropTypes.number,
    }),
    backgroundColor: PropTypes.string,
    isOpen:          PropTypes.bool,
    renderHeader:    PropTypes.func,
    onOpen:          PropTypes.func,
    onClose:         PropTypes.func,
    willClose:         PropTypes.func,
    swipeToDismiss:  PropTypes.bool,
  };

  static defaultProps = {
    springConfig: { tension: 30, friction: 7 },
    backgroundColor: 'black',
  };

  state = {
    isAnimating: false,
    isPanning: false,
    target: {
      x: 0,
      y: 0,
      opacity: 1,
    },
    pan: new Animated.Value(0),
    openVal: new Animated.Value(0),
  };

  componentWillMount() {
    const {isAnimating, pan} = this.state;

    this._panResponder = PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: (evt, gestureState) => !isAnimating,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => !isAnimating,
      onMoveShouldSetPanResponder: (evt, gestureState) => !isAnimating,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => !isAnimating,

      onPanResponderGrant: (evt, gestureState) => {
        pan.setValue(0);
        this.setState({ isPanning: true });
      },
      onPanResponderMove: Animated.event([null, { dy: pan }]),
      onPanResponderTerminationRequest: (evt, gestureState) => true,
      onPanResponderRelease: (evt, gestureState) => {
        if(Math.abs(gestureState.dy) > DRAG_DISMISS_THRESHOLD) {
          this.setState({
            isPanning: false,
            target: {
              y: gestureState.dy,
              x: gestureState.dx,
              opacity: 1 - Math.abs(gestureState.dy / WINDOW_HEIGHT)
            }
          });
          this.close();
        } else {
          Animated.spring(pan, { toValue: 0, ...this.props.springConfig }).start(() => { this.setState({ isPanning: false }); });
        }
      },
    });
  }

  componentDidMount() {
    if(this.props.isOpen) {
      this.open();
    }
  }

  componentWillReceiveProps(props) {
    if(this.props.isOpen != props.isOpen && props.isOpen) {
      this.open();
    }
  }

  open = () => {
    if(isIOS) {
      StatusBar.setHidden(true, 'fade');
    }
    this.state.pan.setValue(0);
    this.setState({
      isAnimating: true,
      target: {
        x: 0,
        y: 0,
        opacity: 1,
      }
    });

    Animated.spring(this.state.openVal, { toValue: 1, ...this.props.springConfig }).start(() => {
      this.setState({ isAnimating: false });
      this.props.didOpen();
    });
  };

  close = () => {
    this.props.willClose();
    if(isIOS) {
      StatusBar.setHidden(false, 'fade');
    }
    this.setState({isAnimating: true });
    Animated.timing(
      this.state.openVal,
      {
        toValue: 0,
        duration: 200,
      }
    ).start(() => {
      this.setState({
        isAnimating: false,
      });
      this.props.onClose();
    });
  };

  render() {
    const {isOpen, renderHeader, swipeToDismiss, origin, backgroundColor} = this.props;
    const {isPanning, isAnimating, openVal, target, pan} = this.state;

    const lightboxOpacityStyle = {opacity: openVal.interpolate({inputRange: [0, 1], outputRange: [0, target.opacity]})};

    let dragStyle;
    if(isPanning) {
      dragStyle = {top: pan};
      lightboxOpacityStyle.opacity = pan.interpolate({inputRange: [-WINDOW_HEIGHT, 0, WINDOW_HEIGHT], outputRange: [0, 1, 0]});
    }

    const content = (
      <React.Fragment>
        {this.renderBackground(backgroundColor, lightboxOpacityStyle)}
        {this.renderContent(target, origin, openVal, dragStyle, swipeToDismiss, lightboxOpacityStyle)}
        {this.renderHeader(renderHeader, lightboxOpacityStyle)}
      </React.Fragment>
    );

    if (this.props.navigator) {
      return (
        <View>
          {content}
        </View>
      );
    } else {
      return (
        <Modal visible={isOpen} transparent={true} onRequestClose={() => this.close()}>
          {content}
        </Modal>
      );
    }
  }

  renderBackground = (backgroundColor, lightboxOpacityStyle) => {
    return <Animated.View style={[styles.background, { backgroundColor }, lightboxOpacityStyle]}/>;
  };

  renderHeader = (renderHeader, lightboxOpacityStyle) => {
    return (
      <Animated.View style={StyleSheet.flatten([styles.header, lightboxOpacityStyle])}>
        {(renderHeader ? renderHeader(this.close) :
            (
              <TouchableOpacity onPress={this.close}>
                <Text style={styles.closeButton}>×</Text>
              </TouchableOpacity>
            )
        )}
      </Animated.View>
    );
  };

  renderContent = (target, origin, openVal, dragStyle, swipeToDismiss, lightboxOpacityStyle) => {
    let handlers;
    if(swipeToDismiss) {
      handlers = this._panResponder.panHandlers;
    }

    const openStyle = [styles.open, {
      left:   openVal.interpolate({inputRange: [0, 1], outputRange: [origin.x, target.x]}),
      top:    openVal.interpolate({inputRange: [0, 1], outputRange: [origin.y + STATUS_BAR_OFFSET, target.y + STATUS_BAR_OFFSET]}),
      width:  openVal.interpolate({inputRange: [0, 1], outputRange: [origin.width, WINDOW_WIDTH]}),
      height: openVal.interpolate({inputRange: [0, 1], outputRange: [origin.height, WINDOW_HEIGHT]}),
    }];

    return (
      <Animated.View style={StyleSheet.flatten([openStyle, dragStyle, lightboxOpacityStyle])} {...handlers}>
        {this.props.children}
      </Animated.View>
    );
  };
}


const commonBackground = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: WINDOW_WIDTH,
}

const styles = StyleSheet.create({
  background: StyleSheet.flatten([commonBackground, {height: WINDOW_HEIGHT}]),
  header: StyleSheet.flatten([commonBackground, {backgroundColor: 'transparent'}]),
  open: {
    position: 'absolute',
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  closeButton: {
    fontSize: 35,
    color: 'white',
    lineHeight: 40,
    width: 40,
    textAlign: 'center',
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 4 },
    textShadowRadius: 5
  },
});
