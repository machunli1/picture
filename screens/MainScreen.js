import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, Button, Platform } from 'react-native';
import { Camera } from 'expo-camera';
import * as PoseDetection from '@tensorflow-models/posenet';
import * as tf from '@tensorflow/tfjs';
import { cameraWithTensors } from '@tensorflow/tfjs-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import PoseDetector from '../utils/PoseDetector';

const TensorCamera = cameraWithTensors(Camera);

const MainScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [count, setCount] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [settings, setSettings] = useState({
    repsPerSet: 10,
    totalSets: 3,
    currentSet: 1,
    restTime: 60
  });
  const [showRestModal, setShowRestModal] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [tfReady, setTfReady] = useState(false);

  const cameraRef = useRef(null);
  const poseNetRef = useRef(null);
  const countdownRef = useRef(null);
  const prevPoseRef = useRef(null);
  const lastCountTimeRef = useRef(0);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      // 初始化TensorFlow
      await tf.ready();
      setTfReady(true);
      
      // Load PoseNet model
      poseNetRef.current = await PoseDetection.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        inputResolution: { width: 200, height: 200 },
        multiplier: 0.75
      });
      
      // Load settings
      loadSettings();
    })();
    
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('squatSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (e) {
      console.log('Failed to load settings');
    }
  };

  const startCountdown = (seconds) => {
    setRestTimeLeft(seconds);
    setShowRestModal(true);
    
    countdownRef.current = setInterval(() => {
      setRestTimeLeft(timeLeft => {
        if (timeLeft <= 1) {
          clearInterval(countdownRef.current);
          setShowRestModal(false);
          return 0;
        }
        return timeLeft - 1;
      });
    }, 1000);
  };

  const playSound = async () => {
    try {
      const soundObject = new Audio.Sound();
      // 在实际项目中，你需要添加一个提示音文件
      // await soundObject.loadAsync(require('../assets/sound/beep.mp3'));
      // await soundObject.playAsync();
    } catch (error) {
      console.log('Could not play sound', error);
    }
  };

  const handleSquatDetected = () => {
    // 防止计数过快
    const now = Date.now();
    if (now - lastCountTimeRef.current < 1000) {
      return;
    }
    
    lastCountTimeRef.current = now;
    playSound();
    
    setCount(prevCount => {
      const newCount = prevCount + 1;
      
      // Check if set is complete
      if (newCount >= settings.repsPerSet) {
        if (settings.currentSet < settings.totalSets) {
          // Start rest period
          startCountdown(settings.restTime);
          
          // Update set
          const updatedSettings = {
            ...settings,
            currentSet: settings.currentSet + 1
          };
          setSettings(updatedSettings);
          AsyncStorage.setItem('squatSettings', JSON.stringify(updatedSettings));
          
          // Reset count for next set
          setTimeout(() => setCount(0), 100);
        } else {
          // All sets complete
          Alert.alert('训练完成', '恭喜你完成了所有组的训练！');
          // Reset to first set
          const updatedSettings = {
            ...settings,
            currentSet: 1
          };
          setSettings(updatedSettings);
          AsyncStorage.setItem('squatSettings', JSON.stringify(updatedSettings));
        }
      }
      
      return newCount;
    });
  };

  const resetCount = () => {
    setCount(0);
  };

  const handleCameraStream = (images) => {
    const loop = async () => {
      const imageTensor = images.next().value;
      
      if (imageTensor) {
        // 使用PoseNet检测姿态
        const pose = await poseNetRef.current.estimateSinglePose(imageTensor, {
          flipHorizontal: false
        });
        
        // 检查是否完成深蹲动作
        if (prevPoseRef.current && PoseDetector.isSquatCompleted(prevPoseRef.current, pose)) {
          handleSquatDetected();
        }
        
        prevPoseRef.current = pose;
      }
      
      tf.dispose([imageTensor]);
      requestAnimationFrame(loop);
    };
    
    loop();
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>请求相机权限...</Text></View>;
  }
  
  if (hasPermission === false) {
    return <View style={styles.container}><Text>无相机权限</Text></View>;
  }
  
  if (!tfReady) {
    return <View style={styles.container}><Text>正在初始化AI模型...</Text></View>;
  }

  return (
    <View style={styles.container}>
      {isDetecting ? (
        <TensorCamera
          style={styles.camera}
          type={Camera.Constants.Type.back}
          zoom={0}
          cameraTextureHeight={1920}
          cameraTextureWidth={1080}
          resizeDepth={3}
          onReady={handleCameraStream}
          autorender={true}
        >
          <View style={styles.counterContainer}>
            <Text style={styles.counter}>{count}</Text>
          </View>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>第 {settings.currentSet} 组 / 共 {settings.totalSets} 组</Text>
            <Text style={styles.infoText}>目标: {settings.repsPerSet} 个/组</Text>
          </View>
          
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.controlButtonText}>设置</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton} onPress={resetCount}>
              <Text style={styles.controlButtonText}>重置</Text>
            </TouchableOpacity>
          </View>
        </TensorCamera>
      ) : (
        <Camera 
          style={styles.camera} 
          ref={cameraRef}
          onCameraReady={() => setIsDetecting(true)}
        >
          <View style={styles.counterContainer}>
            <Text style={styles.counter}>{count}</Text>
          </View>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>第 {settings.currentSet} 组 / 共 {settings.totalSets} 组</Text>
            <Text style={styles.infoText}>目标: {settings.repsPerSet} 个/组</Text>
          </View>
          
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.controlButtonText}>设置</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton} onPress={resetCount}>
              <Text style={styles.controlButtonText}>重置</Text>
            </TouchableOpacity>
          </View>
        </Camera>
      )}
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={showRestModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>组间休息</Text>
            <Text style={styles.modalText}>下一组开始: {restTimeLeft} 秒</Text>
            <Button title="跳过休息" onPress={() => {
              clearInterval(countdownRef.current);
              setShowRestModal(false);
            }} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  counterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    fontSize: 100,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'black',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 2,
  },
  infoContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
  },
  infoText: {
    fontSize: 18,
    color: 'white',
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    marginBottom: 5,
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    borderRadius: 30,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 18,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalText: {
    fontSize: 20,
    marginBottom: 20,
  }
});

export default MainScreen;