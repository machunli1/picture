import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = () => {
  const [settings, setSettings] = useState({
    repsPerSet: '10',
    totalSets: '3',
    restTime: '60'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('squatSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({
          repsPerSet: String(parsed.repsPerSet),
          totalSets: String(parsed.totalSets),
          restTime: String(parsed.restTime)
        });
      }
    } catch (e) {
      console.log('Failed to load settings');
    }
  };

  const saveSettings = async () => {
    try {
      const settingsToSave = {
        repsPerSet: parseInt(settings.repsPerSet) || 10,
        totalSets: parseInt(settings.totalSets) || 3,
        restTime: parseInt(settings.restTime) || 60,
        currentSet: 1
      };
      
      await AsyncStorage.setItem('squatSettings', JSON.stringify(settingsToSave));
      Alert.alert('成功', '设置已保存');
    } catch (e) {
      Alert.alert('错误', '保存设置失败');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>深蹲计数器设置</Text>
      
      <View style={styles.settingItem}>
        <Text style={styles.label}>每组次数:</Text>
        <TextInput
          style={styles.input}
          value={settings.repsPerSet}
          onChangeText={text => setSettings({...settings, repsPerSet: text})}
          keyboardType="numeric"
        />
      </View>
      
      <View style={styles.settingItem}>
        <Text style={styles.label}>总组数:</Text>
        <TextInput
          style={styles.input}
          value={settings.totalSets}
          onChangeText={text => setSettings({...settings, totalSets: text})}
          keyboardType="numeric"
        />
      </View>
      
      <View style={styles.settingItem}>
        <Text style={styles.label}>休息时间(秒):</Text>
        <TextInput
          style={styles.input}
          value={settings.restTime}
          onChangeText={text => setSettings({...settings, restTime: text})}
          keyboardType="numeric"
        />
      </View>
      
      <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
        <Text style={styles.saveButtonText}>保存设置</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 30,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  label: {
    fontSize: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    width: 100,
    textAlign: 'center',
    fontSize: 18,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 50,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  }
});

export default SettingsScreen;